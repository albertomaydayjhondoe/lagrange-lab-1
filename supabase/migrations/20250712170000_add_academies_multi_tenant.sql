-- Multi-tenant: Academia de Academias
-- Adds academies and academy_members tables, plus academy_id FK to existing tables

-- ============================================
-- 1. ACADEMIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  oracle_persona_prompt TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_academies_slug ON public.academies(slug);
CREATE INDEX IF NOT EXISTS idx_academies_owner ON public.academies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_academies_public ON public.academies(is_public) WHERE is_public = true;

-- ============================================
-- 2. ACADEMY MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.academy_members (
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'platon', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (academy_id, user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_academy_members_user ON public.academy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_members_role ON public.academy_members(role);

-- ============================================
-- 3. ADD academy_id FK TO EXISTING TABLES
-- ============================================

-- thematic_axes
ALTER TABLE public.thematic_axes
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_thematic_axes_academy ON public.thematic_axes(academy_id);

-- topology_nodes
ALTER TABLE public.topology_nodes
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_topology_nodes_academy ON public.topology_nodes(academy_id);

-- topology_edges
ALTER TABLE public.topology_edges
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_topology_edges_academy ON public.topology_edges(academy_id);

-- socratic_questions
ALTER TABLE public.socratic_questions
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_socratic_questions_academy ON public.socratic_questions(academy_id);

-- saved_dialogues
ALTER TABLE public.saved_dialogues
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_academy ON public.saved_dialogues(academy_id);

-- podcast_episodes
ALTER TABLE public.podcast_episodes
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_academy ON public.podcast_episodes(academy_id);

-- user_interactions
ALTER TABLE public.user_interactions
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_interactions_academy ON public.user_interactions(academy_id);

-- access_requests
ALTER TABLE public.access_requests
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_access_requests_academy ON public.access_requests(academy_id);

-- corpus_fragments
ALTER TABLE public.corpus_fragments
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_academy ON public.corpus_fragments(academy_id);

-- ============================================
-- 4. CREATE GENESIS ACADEMY (for existing data)
-- ============================================
INSERT INTO public.academies (id, slug, name, description, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'genesis',
  'Academia Génesis',
  'La academia original del Sistema Lagrange. Contiene toda la topología y contenido inicial.',
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. MIGRATE EXISTING DATA TO GENESIS
-- ============================================
UPDATE public.thematic_axes SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;
UPDATE public.topology_nodes SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;
UPDATE public.topology_edges SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;
UPDATE public.socratic_questions SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;
UPDATE public.saved_dialogues SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;
UPDATE public.podcast_episodes SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;
UPDATE public.corpus_fragments SET academy_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE academy_id IS NULL;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_members ENABLE ROW LEVEL SECURITY;

-- academies policies
CREATE POLICY "Public academies are viewable by everyone"
  ON public.academies FOR SELECT
  USING (is_public = true);

CREATE POLICY "Academy owners can view their academies"
  ON public.academies FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = academies.id
      AND academy_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create academies"
  ON public.academies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update their academies"
  ON public.academies FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete their academies"
  ON public.academies FOR DELETE
  USING (owner_user_id = auth.uid());

-- academy_members policies
CREATE POLICY "Members can view their academy memberships"
  ON public.academy_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can manage members"
  ON public.academy_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
    )
  );

-- Update existing table RLS policies to check academy membership
-- These replace the existing policies

-- thematic_axes
DROP POLICY IF EXISTS "Public thematic axes are viewable by everyone" ON public.thematic_axes;
CREATE POLICY "thematic_axes_select" ON public.thematic_axes FOR SELECT
  USING (
    academy_id IS NULL
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = thematic_axes.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- topology_nodes
DROP POLICY IF EXISTS "Public topology_nodes are viewable by everyone" ON public.topology_nodes;
CREATE POLICY "topology_nodes_select" ON public.topology_nodes FOR SELECT
  USING (
    academy_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.academies a
      WHERE a.id = topology_nodes.academy_id
      AND a.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = topology_nodes.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- topology_edges
DROP POLICY IF EXISTS "Public topology_edges are viewable by everyone" ON public.topology_edges;
CREATE POLICY "topology_edges_select" ON public.topology_edges FOR SELECT
  USING (
    academy_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.academies a
      WHERE a.id = topology_edges.academy_id
      AND a.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = topology_edges.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- socratic_questions
DROP POLICY IF EXISTS "Public socratic_questions are viewable by everyone" ON public.socratic_questions;
CREATE POLICY "socratic_questions_select" ON public.socratic_questions FOR SELECT
  USING (
    academy_id IS NULL
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = socratic_questions.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- saved_dialogues
DROP POLICY IF EXISTS "Users can view their own saved_dialogues" ON public.saved_dialogues;
CREATE POLICY "saved_dialogues_select" ON public.saved_dialogues FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = saved_dialogues.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- podcast_episodes
DROP POLICY IF EXISTS "Public podcast_episodes are viewable by everyone" ON public.podcast_episodes;
CREATE POLICY "podcast_episodes_select" ON public.podcast_episodes FOR SELECT
  USING (
    academy_id IS NULL
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = podcast_episodes.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- user_interactions
DROP POLICY IF EXISTS "Users can view their own user_interactions" ON public.user_interactions;
CREATE POLICY "user_interactions_select" ON public.user_interactions FOR SELECT
  USING (user_id = auth.uid());

-- corpus_fragments
DROP POLICY IF EXISTS "corpus_fragments_select" ON public.corpus_fragments;
CREATE POLICY "corpus_fragments_select" ON public.corpus_fragments FOR SELECT
  USING (
    academy_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.academies a
      WHERE a.id = corpus_fragments.academy_id
      AND a.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = corpus_fragments.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is member of academy
CREATE OR REPLACE FUNCTION public.is_academy_member(
  p_academy_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_id = p_academy_id
    AND user_id = p_user_id
  );
END;
$$;

-- Function to get user's role in academy
CREATE OR REPLACE FUNCTION public.get_academy_role(
  p_academy_id UUID,
  p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role FROM public.academy_members
    WHERE academy_id = p_academy_id
    AND user_id = p_user_id
  );
END;
$$;

-- Function to get user's academies
CREATE OR REPLACE FUNCTION public.get_user_academies(p_user_id UUID)
RETURNS TABLE(
  academy_id UUID,
  slug TEXT,
  name TEXT,
  role TEXT,
  is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.slug,
    a.name,
    am.role,
    a.is_public
  FROM public.academies a
  INNER JOIN public.academy_members am ON a.id = am.academy_id
  WHERE am.user_id = p_user_id
  ORDER BY a.name;
END;
$$;

-- ============================================
-- 8. UPDATED AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_academies_updated_at ON public.academies;
CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
