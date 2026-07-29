-- ================================================================
-- FIX RLS: academies y otras tablas dependientes
-- Timestamp: 20260722000002
-- ================================================================

-- =================================================================
-- 1. ARREGLAR POLICIES DE academies
-- =================================================================

-- Drop all existing policies on academies
DROP POLICY IF EXISTS "Academy owners can view their academies" ON public.academies;
DROP POLICY IF EXISTS "Academies are viewable by members and owners" ON public.academies;
DROP POLICY IF EXISTS "Authenticated users can create academies" ON public.academies;
DROP POLICY IF EXISTS "Public academies are viewable by everyone" ON public.academies;
DROP POLICY IF EXISTS "Anyone can create academies" ON public.academies;
DROP POLICY IF EXISTS "Owners can update their academies" ON public.academies;
DROP POLICY IF EXISTS "Owners can delete their academies" ON public.academies;

-- Policy simple: academias publicas son visibles por todos
CREATE POLICY "Public academies are viewable by everyone"
ON public.academies
FOR SELECT
USING (is_public = true);

-- Policy: solo owner o admins de la academia pueden ver su academia (sin recursión con academy_members)
CREATE POLICY "Academy owners admins can view"
ON public.academies
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = academies.id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
  )
);

-- Policy: cualquier usuario autenticado puede crear academias
CREATE POLICY "Authenticated users can create academies"
ON public.academies
FOR INSERT
WITH CHECK (true);

-- Policy: owners pueden actualizar
CREATE POLICY "Owners can update their academies"
ON public.academies
FOR UPDATE
USING (owner_user_id = auth.uid());

-- Policy: owners pueden eliminar
CREATE POLICY "Owners can delete their academies"
ON public.academies
FOR DELETE
USING (owner_user_id = auth.uid());

-- =================================================================
-- 2. INSERT ACADEMIES
-- =================================================================
INSERT INTO public.academies (id, name, slug, description, is_public, owner_user_id, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sócrates', 'socrates', 'Academia de Filosofía y Ética. Exploración socrática del conocimiento.', true, NULL, now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Genesis', 'genesis', 'Academia de Sociología y Pensamiento Crítico. Origen de las ideas.', true, NULL, now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'Platón', 'platon', 'Academia de Metafísica y Ontología. El mundo de las ideas.', true, NULL, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- =================================================================
-- 3. INSERT THEMATIC AXES
-- =================================================================
INSERT INTO public.thematic_axes (id, academy_id, label, description, color, order_index, is_active, created_at, updated_at)
VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ética', 'Estudio de la moral, los valores y el comportamiento humano.', '#4F46E5', 1, true, now(), now()),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Epistemología', 'Teoría del conocimiento. ¿Qué podemos saber?', '#0891B2', 2, true, now(), now()),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Metafísica', 'Naturaleza de la realidad, el ser y la existencia.', '#7C3AED', 3, true, now(), now()),
  ('aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Lógica', 'Principios del razonamiento válido.', '#059669', 4, true, now(), now()),
  ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Sociología', 'Estudio de la sociedad y el comportamiento social.', '#DC2626', 1, true, now(), now()),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Antropología', 'Estudio de la humanidad y las culturas.', '#EA580C', 2, true, now(), now()),
  ('bbbb3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Política', 'Organización del poder y la sociedad.', '#CA8A04', 3, true, now(), now())
ON CONFLICT DO NOTHING;

-- =================================================================
-- 4. INSERT TOPOLOGY NODES
-- =================================================================
INSERT INTO public.topology_nodes (id, academy_id, axis, label, description, color, corpus_refs, question_count, is_active, created_at, updated_at)
VALUES 
  ('cccc1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Virtud', 'Concepto central de la ética aristotélica.', '#4F46E5', NULL, 0, true, now(), now()),
  ('cccc2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Bien Supremo', 'El fin último de la acción humana.', '#6366F1', NULL, 0, true, now(), now()),
  ('cccc3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Docta Ignorancia', 'El único saber es saber que no sabemos.', '#0891B2', NULL, 0, true, now(), now())
ON CONFLICT DO NOTHING;

-- =================================================================
-- 5. INSERT SOCRATIC QUESTIONS
-- =================================================================
INSERT INTO public.socratic_questions (id, academy_id, eje, texto, nivel, tension, corpus_ref, created_at, updated_at)
VALUES 
  ('dddd1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ética', '¿Qué es la virtud?', 1, 0.5, NULL, now(), now()),
  ('dddd2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Ética', '¿Se puede enseñar la virtud?', 2, 0.7, NULL, now(), now()),
  ('dddd3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Epistemología', '¿Qué es el conocimiento verdadero?', 1, 0.6, NULL, now(), now()),
  ('dddd4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Metafísica', '¿Existe el alma?', 3, 0.9, NULL, now(), now())
ON CONFLICT DO NOTHING;

-- =================================================================
-- 6. INSERT ACADEMY SPACES
-- =================================================================
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, icon, color, is_active, order_index, created_at, updated_at)
VALUES 
  ('eeee1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Filosofía', 'filosofia', 'Espacio central de reflexión filosófica', 'BookOpen', '#4F46E5', true, 1, now(), now()),
  ('eeee2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Ética', 'etica', 'Estudio de la moral y los valores', 'Scale', '#10B981', true, 2, now(), now()),
  ('eeee3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sociología', 'sociologia', 'Estudio de las sociedades humanas', 'Users', '#8B5CF6', true, 3, now(), now())
ON CONFLICT (academy_id, slug) DO NOTHING;

-- =================================================================
-- VERIFICACIÓN
-- =================================================================
SELECT 'Academies: ' || COUNT(*) as result FROM public.academies;
SELECT 'Thematic Axes: ' || COUNT(*) as result FROM public.thematic_axes;
SELECT 'Topology Nodes: ' || COUNT(*) as result FROM public.topology_nodes;
SELECT 'Socratic Questions: ' || COUNT(*) as result FROM public.socratic_questions;
SELECT 'Academy Spaces: ' || COUNT(*) as result FROM public.academy_spaces;
