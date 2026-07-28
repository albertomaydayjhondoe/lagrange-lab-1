-- ============================================================
-- SEED DE DATOS DEMO - Carreras Universitarias
-- Universidad del Siglo XXI - Demo Mode
-- Prefijo "demo-" para fácil limpieza
-- ============================================================

-- Desactivar RLS para seed
ALTER TABLE academies DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- CARRERAS
INSERT INTO academies (id, slug, name, description, is_public, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'demo-ingenieria-software', 'Ingeniería de Software', 'Formación integral en desarrollo de software, arquitectura de sistemas y metodologías ágiles.', true, NOW(), NOW()),
  (gen_random_uuid(), 'demo-medicina', 'Medicina', 'Estudio profundo de las ciencias de la salud, diagnóstico clínico y prácticas médicas basadas en evidencia.', true, NOW(), NOW()),
  (gen_random_uuid(), 'demo-derecho', 'Derecho', 'Análisis riguroso del sistema legal, argumentación jurídica y resolución de conflictos.', true, NOW(), NOW()),
  (gen_random_uuid(), 'demo-psicologia', 'Psicología', 'Comprensión del comportamiento humano, procesos cognitivos y salud mental.', true, NOW(), NOW()),
  (gen_random_uuid(), 'demo-diseno-grafico', 'Diseño Gráfico', 'Creatividad aplicada al diseño visual, comunicación gráfica y experiencias digitales.', true, NOW(), NOW()),
  (gen_random_uuid(), 'demo-administracion', 'Administración de Empresas', 'Gestión estratégica de organizaciones, finanzas corporativas y liderazgo empresarial.', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ASIGNATURAS PARA INGENIERÍA
INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-ingenieria-software/algoritmos', 'Algoritmos y Estructuras de Datos', 'Estudio de algoritmos fundamentales y análisis de complejidad.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-ingenieria-software'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-ingenieria-software/base-datos', 'Bases de Datos', 'Diseño e implementación de sistemas de gestión de bases de datos.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-ingenieria-software'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-ingenieria-software/arquitectura', 'Arquitectura de Software', 'Patrones de diseño y arquitecturas escalables.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-ingenieria-software'
ON CONFLICT (slug) DO NOTHING;

-- ASIGNATURAS PARA MEDICINA
INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-medicina/anatomia', 'Anatomía Humana', 'Estudio detallado de la estructura del cuerpo humano.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-medicina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-medicina/fisiologia', 'Fisiología', 'Funcionamiento de los sistemas orgánicos del cuerpo.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-medicina'
ON CONFLICT (slug) DO NOTHING;

-- ASIGNATURAS PARA DERECHO
INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-derecho/derecho-constitucional', 'Derecho Constitucional', 'Fundamentos de la Constitución y derechos fundamentales.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-derecho'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-derecho/derecho-civil', 'Derecho Civil', 'Normas que regulan las relaciones entre particulares.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-derecho'
ON CONFLICT (slug) DO NOTHING;

-- ASIGNATURAS PARA PSICOLOGÍA
INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-psicologia/psicologia-general', 'Psicología General', 'Fundamentos de la psicología y corrientes teóricas.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-psicologia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-psicologia/psicologia-social', 'Psicología Social', 'Influencia del entorno social en el comportamiento.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-psicologia'
ON CONFLICT (slug) DO NOTHING;

-- ASIGNATURAS PARA DISEÑO
INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-diseno-grafico/teoria-color', 'Teoría del Color', 'Psicología del color y armonías cromáticas.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-diseno-grafico'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-diseno-grafico/diseno-ux', 'Diseño UX/UI', 'Experiencia de usuario y diseño de interfaces.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-diseno-grafico'
ON CONFLICT (slug) DO NOTHING;

-- ASIGNATURAS PARA ADMINISTRACIÓN
INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-administracion/gestion-financiera', 'Gestión Financiera', 'Análisis financiero y valoración de inversiones.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-administracion'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (id, academy_id, slug, name, description, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'demo-administracion/marketing', 'Marketing Estratégico', 'Planificación de marketing y branding.', NOW(), NOW()
FROM academies a WHERE a.slug = 'demo-administracion'
ON CONFLICT (slug) DO NOTHING;

-- FRAGMENTOS DE CORPUS (sin embedding para demo)
INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
SELECT gen_random_uuid(), a.id, s.id, 'Introducción a Algoritmos', 'Un algoritmo es una secuencia finita de pasos bien definidos que permiten resolver un problema. La eficiencia se mide en términos de tiempo y espacio computacional. La notación Big O describe el comportamiento asintótico.', 0, 1, 'demo:manual', NOW(), NOW()
FROM academies a, subjects s WHERE a.slug = 'demo-ingenieria-software' AND s.slug = 'demo-ingenieria-software/algoritmos'
ON CONFLICT DO NOTHING;

INSERT INTO corpus_fragments (id, academy_id, subject_id, title, content, chunk_index, total_chunks, source_url, created_at, updated_at)
SELECT gen_random_uuid(), a.id, s.id, 'Sistema Esquelético', 'El sistema esquelético humano está compuesto por 206 huesos. Se divide en esqueleto axial y esqueleto appendicular. Los huesos cumplen funciones de protección, soporte, movimiento y producción de células sanguíneas.', 0, 1, 'demo:atlas', NOW(), NOW()
FROM academies a, subjects s WHERE a.slug = 'demo-medicina' AND s.slug = 'demo-medicina/anatomia'
ON CONFLICT DO NOTHING;

-- Reactivar RLS
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
