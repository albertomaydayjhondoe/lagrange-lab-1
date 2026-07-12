-- Add vitality tracking fields to topology_nodes for living map effect
-- These fields track node popularity and help determine attenuation/glow

ALTER TABLE public.topology_nodes 
ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vitality_score REAL DEFAULT 0.5;

-- Create index for efficient queries on interaction data
CREATE INDEX IF NOT EXISTS idx_topology_nodes_interaction_count 
ON public.topology_nodes(interaction_count DESC);

CREATE INDEX IF NOT EXISTS idx_topology_nodes_last_interaction 
ON public.topology_nodes(last_interaction_at DESC NULLS LAST);

-- Add index for generated nodes (for cleanup)
CREATE INDEX IF NOT EXISTS idx_topology_nodes_is_generated 
ON public.topology_nodes(is_generated) WHERE is_generated = true;

-- Create function to update node vitality based on interactions
CREATE OR REPLACE FUNCTION public.update_node_vitality(
  p_node_id TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.topology_nodes
  SET 
    interaction_count = interaction_count + p_increment,
    last_interaction_at = NOW(),
    vitality_score = LEAST(1.0, vitality_score + (p_increment * 0.05)),
    updated_at = NOW()
  WHERE id = p_node_id;
END;
$$;

-- Create trigger to auto-update vitality on interaction insert
CREATE OR REPLACE FUNCTION public.trigger_update_vitality()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.node_id IS NOT NULL THEN
    PERFORM public.update_node_vitality(NEW.node_id, 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to user_interactions (only if not exists)
DROP TRIGGER IF EXISTS on_interaction_update_vitality ON public.user_interactions;
CREATE TRIGGER on_interaction_update_vitality
  AFTER INSERT ON public.user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_vitality();

-- Function to decay vitality over time (for forgotten nodes)
-- This can be called periodically by a cron job or edge function
CREATE OR REPLACE FUNCTION public.decay_node_vitality(
  p_hours_without_interaction INTEGER DEFAULT 168,  -- 7 days default
  p_decay_rate REAL DEFAULT 0.02  -- 2% decay per check
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE public.topology_nodes
  SET 
    vitality_score = GREATEST(0.1, vitality_score - p_decay_rate),
    updated_at = NOW()
  WHERE 
    is_generated = true
    AND (last_interaction_at IS NULL OR last_interaction_at < NOW() - (p_hours_without_interaction || ' hours')::INTERVAL)
    AND vitality_score > 0.1;
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

-- Function to get the dominant axis this week (for fog calculation)
CREATE OR REPLACE FUNCTION public.get_dominant_axis_this_week()
RETURNS TABLE(axis TEXT, interaction_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tn.axis,
    COUNT(ui.id)::BIGINT as interaction_count
  FROM public.user_interactions ui
  JOIN public.topology_nodes tn ON tn.id = ui.node_id
  WHERE ui.created_at > NOW() - INTERVAL '7 days'
  GROUP BY tn.axis
  ORDER BY interaction_count DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_dominant_axis_this_week IS 
'Returns the thematic axis with most user interactions in the past 7 days.
Used to determine the narrative center for fog density calculation.';
