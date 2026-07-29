-- Create tables for the conversational brain data

-- Nodes table
CREATE TABLE public.topology_nodes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  x INTEGER NOT NULL DEFAULT 400,
  y INTEGER NOT NULL DEFAULT 300,
  weight REAL NOT NULL DEFAULT 0.5,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  axis TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'core',
  corpus_refs TEXT[] DEFAULT '{}',
  question_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Edges table
CREATE TABLE public.topology_edges (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL REFERENCES public.topology_nodes(id) ON DELETE CASCADE,
  target TEXT NOT NULL REFERENCES public.topology_nodes(id) ON DELETE CASCADE,
  tension REAL NOT NULL DEFAULT 0.5,
  label TEXT,
  type TEXT NOT NULL DEFAULT 'causal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Socratic questions table
CREATE TABLE public.socratic_questions (
  id TEXT PRIMARY KEY,
  eje TEXT NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 1 CHECK (nivel >= 1 AND nivel <= 3),
  tension REAL NOT NULL DEFAULT 0.5,
  texto TEXT NOT NULL,
  corpus_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topology_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topology_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socratic_questions ENABLE ROW LEVEL SECURITY;

-- Create admin check function using email
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'sampayo@gmail.com'
  )
$$;

-- RLS Policies for topology_nodes
CREATE POLICY "Anyone can view nodes" ON public.topology_nodes
FOR SELECT USING (true);

CREATE POLICY "Admin can insert nodes" ON public.topology_nodes
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin can update nodes" ON public.topology_nodes
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admin can delete nodes" ON public.topology_nodes
FOR DELETE USING (public.is_admin_user());

-- RLS Policies for topology_edges
CREATE POLICY "Anyone can view edges" ON public.topology_edges
FOR SELECT USING (true);

CREATE POLICY "Admin can insert edges" ON public.topology_edges
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin can update edges" ON public.topology_edges
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admin can delete edges" ON public.topology_edges
FOR DELETE USING (public.is_admin_user());

-- RLS Policies for socratic_questions
CREATE POLICY "Anyone can view questions" ON public.socratic_questions
FOR SELECT USING (true);

CREATE POLICY "Admin can insert questions" ON public.socratic_questions
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin can update questions" ON public.socratic_questions
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admin can delete questions" ON public.socratic_questions
FOR DELETE USING (public.is_admin_user());

-- Add updated_at triggers
CREATE TRIGGER update_topology_nodes_updated_at
BEFORE UPDATE ON public.topology_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topology_edges_updated_at
BEFORE UPDATE ON public.topology_edges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_socratic_questions_updated_at
BEFORE UPDATE ON public.socratic_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();