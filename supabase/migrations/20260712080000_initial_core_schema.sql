-- Initial core schema for Lagrange Lab (minimal to satisfy app expectations)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Thematic axes
CREATE TABLE IF NOT EXISTS public.thematic_axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Topology nodes
CREATE TABLE IF NOT EXISTS public.topology_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  axis UUID REFERENCES public.thematic_axes(id) ON DELETE SET NULL,
  x NUMERIC DEFAULT 0,
  y NUMERIC DEFAULT 0,
  weight NUMERIC DEFAULT 0.5,
  color TEXT,
  type TEXT DEFAULT 'core',
  corpus_refs JSONB DEFAULT '[]'::jsonb,
  question_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Topology edges
CREATE TABLE IF NOT EXISTS public.topology_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source UUID REFERENCES public.topology_nodes(id) ON DELETE CASCADE,
  target UUID REFERENCES public.topology_nodes(id) ON DELETE CASCADE,
  tension NUMERIC DEFAULT 0,
  label TEXT,
  type TEXT DEFAULT 'undirected',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Socratic questions
CREATE TABLE IF NOT EXISTS public.socratic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eje UUID REFERENCES public.thematic_axes(id) ON DELETE SET NULL,
  nivel INT DEFAULT 0,
  tension NUMERIC DEFAULT 0,
  texto TEXT,
  corpus_ref UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Podcast episodes
CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved dialogues
CREATE TABLE IF NOT EXISTS public.saved_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Access requests
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles (minimal)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  metadata JSONB
);

-- User roles (optional)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_thematic_axes_order ON public.thematic_axes(order_index);
CREATE INDEX IF NOT EXISTS idx_topology_nodes_axis ON public.topology_nodes(axis);
CREATE INDEX IF NOT EXISTS idx_topology_edges_source ON public.topology_edges(source);
