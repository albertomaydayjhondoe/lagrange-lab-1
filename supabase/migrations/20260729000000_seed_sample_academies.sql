-- ================================================================
-- SEED DATA: 5 Carreras de Ejemplo para Demo
-- ================================================================

-- 1. Facultad de Filosofía
INSERT INTO public.academies (id, name, slug, description, is_public, oracle_persona_prompt, owner_user_id)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  'Facultad de Filosofía',
  'filosofia',
  'Explora las grandes preguntas del pensamiento humano. Del ser al deber ser, de la lógica a la ética.',
  true,
  'Eres un oráculo filosófico socrático. Desafías al estudiante a pensar más allá de lo obvio. Cuando dices algo, pregúntate si también estás diciendo lo opuesto. Color: #7C3AED',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Crear materias para Filosofía
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, icon, color, is_active, order_index)
VALUES 
  ('11111111-1111-1111-1111-111111111201', '11111111-1111-1111-1111-111111111101', 'Metafísica', 'metafisica', 'El estudio del ser y la naturaleza de la realidad.', 'BookOpen', '#7C3AED', true, 1),
  ('11111111-1111-1111-1111-111111111202', '11111111-1111-1111-1111-111111111101', 'Lógica', 'logica', 'El arte del razonamiento válido y la argumentación.', 'Brain', '#3B82F6', true, 2),
  ('11111111-1111-1111-1111-111111111203', '11111111-1111-1111-1111-111111111101', 'Ética', 'etica', 'La reflexión sobre el bien, el mal y la moral.', 'Heart', '#EF4444', true, 3),
  ('11111111-1111-1111-1111-111111111204', '11111111-1111-1111-1111-111111111101', 'Epistemología', 'epistemologia', 'El estudio del conocimiento y sus límites.', 'Lightbulb', '#F59E0B', true, 4)
ON CONFLICT (slug) DO NOTHING;

-- 2. Facultad de Ciencias
INSERT INTO public.academies (id, name, slug, description, is_public, oracle_persona_prompt, owner_user_id)
VALUES (
  '11111111-1111-1111-1111-111111111102',
  'Facultad de Ciencias',
  'ciencias',
  'Método, experimentación y la belleza de descubrir cómo funciona el universo.',
  true,
  'Eres un científico socrático. Cuestionas las assumptions y llevas al estudiante a descubrir por sí mismo. Color: #059669',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Crear materias para Ciencias
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, icon, color, is_active, order_index)
VALUES 
  ('11111111-1111-1111-1111-111111111211', '11111111-1111-1111-1111-111111111102', 'Física Cuántica', 'fisica-cuantica', 'El mundo subatómico y sus paradojas.', 'Atom', '#059669', true, 1),
  ('11111111-1111-1111-1111-111111111212', '11111111-1111-1111-1111-111111111102', 'Biología Molecular', 'biologia-molecular', 'La vida a escala molecular.', 'Dna', '#10B981', true, 2),
  ('11111111-1111-1111-1111-111111111213', '11111111-1111-1111-1111-111111111102', 'Matemáticas Puras', 'matematicas-puras', 'La belleza abstracta de los números.', 'Calculator', '#6366F1', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Facultad de Literatura
INSERT INTO public.academies (id, name, slug, description, is_public, oracle_persona_prompt, owner_user_id)
VALUES (
  '11111111-1111-1111-1111-111111111103',
  'Facultad de Literatura',
  'literatura',
  'Palabras que transforman. Analiza, interpreta y crea a través de la expresión literaria.',
  true,
  'Eres un crítico literario socrático. Haces preguntas sobre intención, significado y efecto. Color: #DC2626',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Crear materias para Literatura
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, icon, color, is_active, order_index)
VALUES 
  ('11111111-1111-1111-1111-111111111221', '11111111-1111-1111-1111-111111111103', 'Poesía Moderna', 'poesia-moderna', 'De Baudelaire a Neruda.', 'Feather', '#DC2626', true, 1),
  ('11111111-1111-1111-1111-111111111222', '11111111-1111-1111-1111-111111111103', 'Narrativa Contemporánea', 'narrativa', 'La novela moderna y sus corrientes.', 'BookOpen', '#EF4444', true, 2),
  ('11111111-1111-1111-1111-111111111223', '11111111-1111-1111-1111-111111111103', 'Teoría Literaria', 'teoria', 'Análisis de estructuras y corrientes.', 'GraduationCap', '#F97316', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- 4. Facultad de Historia
INSERT INTO public.academies (id, name, slug, description, is_public, oracle_persona_prompt, owner_user_id)
VALUES (
  '11111111-1111-1111-1111-111111111104',
  'Facultad de Historia',
  'historia',
  'El pasado ilumina el presente. Comprende las civilizaciones que nos precedieron.',
  true,
  'Eres un historiador socrático. Cuestionas la narrativa y llevas al estudiante a cuestionar los hechos. Color: #F59E0B',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Crear materias para Historia
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, icon, color, is_active, order_index)
VALUES 
  ('11111111-1111-1111-1111-111111111231', '11111111-1111-1111-1111-111111111104', 'Historia Antigua', 'historia-antigua', 'De Mesopotamia a Roma.', 'Landmark', '#F59E0B', true, 1),
  ('11111111-1111-1111-1111-111111111232', '11111111-1111-1111-1111-111111111104', 'Edad Media', 'edad-media', 'Feudalismo, cruzada y peste.', 'Castle', '#D97706', true, 2),
  ('11111111-1111-1111-1111-111111111233', '11111111-1111-1111-1111-111111111104', 'Historia Contemporánea', 'historia-contemporanea', 'Del siglo XIX a nuestros días.', 'Clock', '#FBBF24', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- 5. Facultad de Psicología
INSERT INTO public.academies (id, name, slug, description, is_public, oracle_persona_prompt, owner_user_id)
VALUES (
  '11111111-1111-1111-1111-111111111105',
  'Facultad de Psicología',
  'psicologia',
  'La mente humana es la última frontera. Explora la conducta, la cognición y la emoción.',
  true,
  'Eres un psicólogo socrático. Ayudas a reflexionar, no a darte respuestas easy. Color: #3B82F6',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Crear materias para Psicología
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, icon, color, is_active, order_index)
VALUES 
  ('11111111-1111-1111-1111-111111111241', '11111111-1111-1111-1111-111111111105', 'Psicología Cognitiva', 'psicologia-cognitiva', 'Cómo procesamos información y pensamos.', 'Brain', '#3B82F6', true, 1),
  ('11111111-1111-1111-1111-111111111242', '11111111-1111-1111-1111-111111111105', 'Neurociencia', 'neurociencia', 'El cerebro y sus misterios.', 'Activity', '#60A5FA', true, 2)
ON CONFLICT (slug) DO NOTHING;

-- Verificación
SELECT 'Academias creadas: ' || COUNT(*) as total FROM public.academies WHERE slug IN ('filosofia', 'ciencias', 'literatura', 'historia', 'psicologia');
SELECT 'Materias creadas: ' || COUNT(*) as total FROM public.academy_spaces WHERE academy_id LIKE '11111111-1111-1111-1111-1111111111%';
