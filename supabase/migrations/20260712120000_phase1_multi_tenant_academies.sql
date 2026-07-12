CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core academy tables
CREATE TABLE public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.academy_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (academy_id, user_id)
);

ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_default_academy_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.academies
  WHERE slug = 'genesis'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_is_member_of_academy(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_memberships am
    WHERE am.user_id = COALESCE(_user_id, auth.uid())
      AND am.academy_id = _academy_id
      AND am.status = 'active'
  )
$$;

-- Simple role check: consider a user to "have a role" if they hold that role
-- in an active membership. This keeps RLS checks consistent even if a
-- dedicated user_roles table isn't present yet.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_memberships am
    WHERE am.user_id = COALESCE(_user_id, auth.uid())
      AND am.role = _role
      AND am.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_read_academy(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academies a
    WHERE a.id = _academy_id
      AND (
        a.is_public
        OR public.user_is_member_of_academy(COALESCE(_user_id, auth.uid()), a.id)
        OR public.has_role(COALESCE(_user_id, auth.uid()), 'admin')
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_academy(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_memberships am
    WHERE am.user_id = COALESCE(_user_id, auth.uid())
      AND am.academy_id = _academy_id
      AND am.status = 'active'
      AND am.role IN ('owner', 'admin')
  ) OR public.has_role(COALESCE(_user_id, auth.uid()), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.set_default_academy_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.academy_id IS NULL THEN
    NEW.academy_id := public.get_default_academy_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Seed the legacy academy and make it public for backward compatibility
INSERT INTO public.academies (slug, name, description, is_public, created_by)
VALUES ('genesis', 'Genesis', 'Academia heredada de Lagrange Lab', true, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Add academy scoping to the main content tables
ALTER TABLE public.topology_nodes ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;
ALTER TABLE public.topology_edges ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;
ALTER TABLE public.socratic_questions ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;
ALTER TABLE public.thematic_axes ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;
ALTER TABLE public.podcast_episodes ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;
ALTER TABLE public.saved_dialogues ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

UPDATE public.topology_nodes
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

UPDATE public.topology_edges
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

UPDATE public.socratic_questions
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

UPDATE public.thematic_axes
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

UPDATE public.podcast_episodes
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

UPDATE public.saved_dialogues
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

UPDATE public.access_requests
SET academy_id = public.get_default_academy_id()
WHERE academy_id IS NULL;

CREATE TRIGGER set_topology_nodes_academy_id
BEFORE INSERT ON public.topology_nodes
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE TRIGGER set_topology_edges_academy_id
BEFORE INSERT ON public.topology_edges
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE TRIGGER set_socratic_questions_academy_id
BEFORE INSERT ON public.socratic_questions
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE TRIGGER set_thematic_axes_academy_id
BEFORE INSERT ON public.thematic_axes
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE TRIGGER set_podcast_episodes_academy_id
BEFORE INSERT ON public.podcast_episodes
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE TRIGGER set_saved_dialogues_academy_id
BEFORE INSERT ON public.saved_dialogues
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE TRIGGER set_access_requests_academy_id
BEFORE INSERT ON public.access_requests
FOR EACH ROW EXECUTE FUNCTION public.set_default_academy_id();

CREATE INDEX IF NOT EXISTS idx_academies_slug ON public.academies (slug);
CREATE INDEX IF NOT EXISTS idx_academy_memberships_academy_id ON public.academy_memberships (academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_memberships_user_id ON public.academy_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_topology_nodes_academy_id ON public.topology_nodes (academy_id);
CREATE INDEX IF NOT EXISTS idx_topology_edges_academy_id ON public.topology_edges (academy_id);
CREATE INDEX IF NOT EXISTS idx_socratic_questions_academy_id ON public.socratic_questions (academy_id);
CREATE INDEX IF NOT EXISTS idx_thematic_axes_academy_id ON public.thematic_axes (academy_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_academy_id ON public.podcast_episodes (academy_id);
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_academy_id ON public.saved_dialogues (academy_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_academy_id ON public.access_requests (academy_id);

-- RLS policies for academies
-- Drop policies if they exist to make this migration idempotent
DO $$ BEGIN
  PERFORM 1 FROM pg_policy WHERE polname = 'Anyone can view public academies' LIMIT 1;
EXCEPTION WHEN undefined_table THEN NULL; END$$;
DROP POLICY IF EXISTS "Anyone can view public academies" ON public.academies;
DROP POLICY IF EXISTS "Members can manage their academies" ON public.academies;
DROP POLICY IF EXISTS "Admins can update academies" ON public.academies;
DROP POLICY IF EXISTS "Admins can delete academies" ON public.academies;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.academy_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.academy_memberships;

DROP POLICY IF EXISTS "Users can view academy content" ON public.topology_nodes;
DROP POLICY IF EXISTS "Admins can manage topology nodes" ON public.topology_nodes;
DROP POLICY IF EXISTS "Users can view academy content" ON public.topology_edges;
DROP POLICY IF EXISTS "Admins can manage topology edges" ON public.topology_edges;
DROP POLICY IF EXISTS "Users can view academy content" ON public.socratic_questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.socratic_questions;
DROP POLICY IF EXISTS "Users can view academy content" ON public.thematic_axes;
DROP POLICY IF EXISTS "Admins can manage axes" ON public.thematic_axes;
DROP POLICY IF EXISTS "Users can view published academy episodes" ON public.podcast_episodes;
DROP POLICY IF EXISTS "Admins can manage episodes" ON public.podcast_episodes;

DROP POLICY IF EXISTS "Users can view their own dialogues or academy content" ON public.saved_dialogues;
DROP POLICY IF EXISTS "Users can insert their own dialogues" ON public.saved_dialogues;
DROP POLICY IF EXISTS "Users can update their own dialogues or manage academy" ON public.saved_dialogues;
DROP POLICY IF EXISTS "Users can delete their own dialogues or manage academy" ON public.saved_dialogues;

DROP POLICY IF EXISTS "Users can view academy access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Anyone can submit access request" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can delete access requests" ON public.access_requests;

CREATE POLICY "Anyone can view public academies"
ON public.academies
FOR SELECT
USING (is_public OR public.user_can_manage_academy(auth.uid(), id));

CREATE POLICY "Members can manage their academies"
ON public.academies
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update academies"
ON public.academies
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete academies"
ON public.academies
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for academy memberships
CREATE POLICY "Users can view their own memberships"
ON public.academy_memberships
FOR SELECT
USING (auth.uid() = user_id OR public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Admins can manage memberships"
ON public.academy_memberships
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for core content tables
CREATE POLICY "Users can view academy content"
ON public.topology_nodes
FOR SELECT
USING (public.user_can_read_academy(auth.uid(), academy_id));

CREATE POLICY "Admins can manage topology nodes"
ON public.topology_nodes
FOR ALL
USING (public.user_can_manage_academy(auth.uid(), academy_id))
WITH CHECK (public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can view academy content"
ON public.topology_edges
FOR SELECT
USING (public.user_can_read_academy(auth.uid(), academy_id));

CREATE POLICY "Admins can manage topology edges"
ON public.topology_edges
FOR ALL
USING (public.user_can_manage_academy(auth.uid(), academy_id))
WITH CHECK (public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can view academy content"
ON public.socratic_questions
FOR SELECT
USING (public.user_can_read_academy(auth.uid(), academy_id));

CREATE POLICY "Admins can manage questions"
ON public.socratic_questions
FOR ALL
USING (public.user_can_manage_academy(auth.uid(), academy_id))
WITH CHECK (public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can view academy content"
ON public.thematic_axes
FOR SELECT
USING (public.user_can_read_academy(auth.uid(), academy_id));

CREATE POLICY "Admins can manage axes"
ON public.thematic_axes
FOR ALL
USING (public.user_can_manage_academy(auth.uid(), academy_id))
WITH CHECK (public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can view published academy episodes"
ON public.podcast_episodes
FOR SELECT
USING (
  (published = true AND public.user_can_read_academy(auth.uid(), academy_id))
  OR public.user_can_manage_academy(auth.uid(), academy_id)
);

CREATE POLICY "Admins can manage episodes"
ON public.podcast_episodes
FOR ALL
USING (public.user_can_manage_academy(auth.uid(), academy_id))
WITH CHECK (public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can view their own dialogues or academy content"
ON public.saved_dialogues
FOR SELECT
USING (auth.uid() = user_id OR public.user_can_read_academy(auth.uid(), academy_id));

CREATE POLICY "Users can insert their own dialogues"
ON public.saved_dialogues
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.user_can_read_academy(auth.uid(), academy_id));

CREATE POLICY "Users can update their own dialogues or manage academy"
ON public.saved_dialogues
FOR UPDATE
USING (auth.uid() = user_id OR public.user_can_manage_academy(auth.uid(), academy_id))
WITH CHECK (auth.uid() = user_id OR public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can delete their own dialogues or manage academy"
ON public.saved_dialogues
FOR DELETE
USING (auth.uid() = user_id OR public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Users can view academy access requests"
ON public.access_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update access requests"
ON public.access_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.user_can_manage_academy(auth.uid(), academy_id));

CREATE POLICY "Admins can delete access requests"
ON public.access_requests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.user_can_manage_academy(auth.uid(), academy_id));
