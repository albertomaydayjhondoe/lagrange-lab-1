-- ============================================================
-- SEED ACADEMIA LEXIS - Materias PAAU
-- Academia de preparación multidisciplinar para selectividad y oposiciones
-- ============================================================

-- Desactivar RLS para seed
ALTER TABLE academies DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- ACADEMIA LEXIS (única academia del MVP)
INSERT INTO academies (id, slug, name, description, is_public, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'academia-lexis', 'Academia Lexis', 'Academia de preparación multidisciplinar para selectividad y oposiciones. Tutoría con oráculo IA socrático y biblioteca RAG.', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- MATERIAS PAAU (Pruebas de Acceso a la Universidad)
-- Materias troncales obligatorias
INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'paau/lengua', 'Lengua Castellana', 'Análisis lingüístico, literatura y expresión escrita para la selectividad.', 'BookOpen', '#7C3AED', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'paau/historia', 'Historia de España', 'Historia de España desde el siglo XIX hasta la actualidad para la prueba de selectividad.', 'Scroll', '#F59E0B', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'paau/matematicas', 'Matemáticas', 'Matemáticas II para ciencias e ingeniería. Análisis, álgebra y geometría.', 'Calculator', '#059669', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'paau/filosofia', 'Filosofía', 'Historia de la filosofía y problemas fundamentales del pensamiento.', 'Brain', '#3B82F6', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'paau/ingles', 'Inglés', 'English language preparation for university entrance exams. Grammar, reading comprehension and writing.', 'Globe', '#EC4899', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Materias optativas comunes
INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'paau/latino', 'Latín', 'Gramática, vocabulario y traducción del latín para la selectividad.', 'Landmark', '#8B5CF6', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'paau/economia', 'Economía', 'Fundamentos de economía, mercado, oferta y demanda para selectividad.', 'TrendingUp', '#10B981', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, icon, color, is_active, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'paau/fisica', 'Física', 'Física para selectividad. Mecánica, electromagnetismo y ondas.', 'Zap', '#F97316', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- CORPUS FRAGMENTS PARA PAAU (sin embeddings - se generan en producción)
-- Fragmentos de ejemplo para Lengua Castellana
INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Figuras retóricas', 'Las figuras retóricas son recursos lingüísticos que embellecen el lenguaje. Las principales son: metáfora (uso de una palabra con significado diferente al habitual), símil (comparación explícita con "como" o "tal como"), personificación (atribuir cualidades humanas a seres inanimados), hipérbole (exageración), e ironía (uso de palabras en sentido opuesto al literal).', 0, 1, 'lexis:paau:lengua', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Fragmentos de ejemplo para Historia de España
INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'La Segunda República', 'La Segunda República Española (1931-1939) se proclamó el 14 de abril de 1931. Sus principales reformas incluyeron: la reforma agraria, la autonomíaregional (Estatuto de Cataluña de 1932), la educación laica y el matrimonio civil. La tensiones entre izquierda y derecha, el intento de golpe de Estado de 1932 (Sanjurjada) y la revolución de 1934 llevarían a la Guerra Civil.', 0, 1, 'lexis:paau:historia', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Fragmentos de ejemplo para Matemáticas
INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Derivadas', 'La derivada de una función f(x) en un punto x=a se define como el límite del cociente incremental: f''(a) = lim(h→0) [f(a+h) - f(a)] / h. Geometricamente representa la pendiente de la recta tangente. Reglas fundamentales: derivada de xⁿ = n·xⁿ⁻¹, derivada de sen(x) = cos(x), derivada de cos(x) = -sen(x), derivada de eˣ = eˣ, derivada de ln(x) = 1/x.', 0, 1, 'lexis:paau:matematicas', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Fragmentos de ejemplo para Filosofía
INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'El Método Cartesiano', 'René Descartes (1596-1650) buscaba un conocimientoCertain (cierto) eindudable. Su método consiste en: 1) Evidencia: no aceptar nada como verdadero que no sea evidente. 2) Análisis: dividir los problemas en partes sencillas. 3) Síntesis: reconstruir el conocimiento de lo simple a lo complejo. 4) Enummeración: revisar todo el proceso para no omitir nada. El cogito ergo sum ("pienso, luego existo") es el primer principio indudable.', 0, 1, 'lexis:paau:filosofia', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Fragmentos de ejemplo para Inglés
INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Passive Voice', 'The passive voice is used when the action is more important than the subject. Structure: Subject + be + past participle. Examples: "The exam was taken by all students" (exam = subject, was taken = passive verb), "Shakespeare wrote Hamlet" → "Hamlet was written by Shakespeare". In passive, the agent can be mentioned with "by". Tenses: Simple Present: is/are + past participle. Simple Past: was/were + past participle. Present Perfect: has/have been + past participle.', 0, 1, 'lexis:paau:ingles', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verificación
SELECT 'Academia Lexis creada' AS status;
SELECT COUNT(*) AS total_subjects FROM subjects WHERE academy_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) AS total_corpus FROM corpus_fragments WHERE academy_id = '00000000-0000-0000-0000-000000000001';

-- Reactivar RLS
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
