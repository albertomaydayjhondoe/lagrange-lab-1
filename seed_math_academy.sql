-- ================================================================
-- SEED DATA: Academia de Matemáticas con RAG
-- ================================================================

-- 1. Crear academia de Matemáticas
INSERT INTO public.academies (id, name, slug, description, is_public, oracle_persona_prompt)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Pitágoras',
  'pitagoras',
  'Academia de Matemáticas y Geometría. Exploramos teoremas, demostraciones y la belleza de los números.',
  true,
  'Eres un matemático socrático que desafía a pensar más allá de las fórmulas. Preguntas sobre por qué, no solo cómo.'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Crear espacios temáticos para la academia de matemáticas
INSERT INTO public.academy_spaces (id, academy_id, name, slug, description, is_active)
VALUES 
  ('cccc0001-0001-0001-0001-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Geometría', 'geometria', 'Espacio para explorar figuras, áreas y el Teorema de Pitágoras.', true),
  ('cccc0001-0001-0001-0001-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Álgebra', 'algebra', 'Ecuaciones, polinomios y estructuras algebraicas.', true),
  ('cccc0001-0001-0001-0001-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Análisis', 'analisis', 'Límites, derivadas e integrales.', true)
ON CONFLICT (slug) DO NOTHING;

-- 3. Crear ejes temáticos específicos de matemáticas
INSERT INTO public.thematic_axes (id, academy_id, label, description, color, order_index)
VALUES 
  ('dddd0001-0001-0001-0001-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Demostración', 'El arte de probar verdades matemáticas.', '#7C3AED', 1),
  ('dddd0001-0001-0001-0001-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Intuición', 'Cómo sentimos las verdades matemáticas antes de probarlas.', '#2563EB', 2),
  ('dddd0001-0001-0001-0001-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Aplicación', 'Cómo las matemáticas describen el mundo real.', '#059669', 3),
  ('dddd0001-0001-0001-0001-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Elegencia', 'La belleza de una demostración simple.', '#DC2626', 4)
ON CONFLICT DO NOTHING;

-- 4. Crear corpus_fragments con material RAG sobre el Teorema de Pitágoras
INSERT INTO public.corpus_fragments (id, academy_id, space_id, source_file, chunk_text, chunk_index, token_count, status, source_type, content_hash)
VALUES 
  (
    'eeee0001-0001-0001-0001-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'El Teorema de Pitágoras establece que en un triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos. Si a y b son los catetos y c es la hipotenusa, entonces: a² + b² = c².',
    0,
    45,
    'active',
    'material',
    'hash_pitagoras_01'
  ),
  (
    'eeee0001-0001-0001-0001-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'Una demostración clásica del teorema usa áreas. Si construimos un cuadrado de lado (a+b) y colocamos cuatro copias del triángulo rectángulo dentro, el área restante forma un cuadrado de lado c. Las áreas de los cuatro triángulos son 4 × (ab/2) = 2ab, y el cuadrado grande tiene área (a+b)² = a² + 2ab + b². Restando las áreas: a² + b² = c².',
    1,
    85,
    'active',
    'material',
    'hash_pitagoras_02'
  ),
  (
    'eeee0001-0001-0001-0001-000000000003',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'La distancia pitagórica generaliza el teorema a n dimensiones: la distancia entre dos puntos (x₁, x₂, ..., xₙ) y (y₁, y₂, ..., yₙ) es √[(x₁-y₁)² + (x₂-y₂)² + ... + (xₙ-yₙ)²]. Esta fórmula es fundamental en machine learning, física y geometría computacional.',
    2,
    72,
    'active',
    'material',
    'hash_pitagoras_03'
  ),
  (
    'eeee0001-0001-0001-0001-000000000004',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'El recíproco del teorema también es verdadero: si en un triángulo se cumple que a² + b² = c², entonces el triángulo es rectángulo, con el ángulo recto opuesto al lado c. Esta propiedad se usa para verificar si un ángulo es recto en construcción y topografía.',
    3,
    65,
    'active',
    'material',
    'hash_pitagoras_04'
  ),
  (
    'eeee0001-0001-0001-0001-000000000005',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'El teorema de Pitágoras fue conocido por babilonios, egipcios e indios mucho antes que Pitágoras. Los pitagóricos lo demostraron alrededor del 500 a.C. Lo revolucionário no fue el teorema mismo, sino la idea de que las matemáticas podían ser un sistema deductivo puro, independientes de la experiencia sensorial.',
    4,
    78,
    'active',
    'material',
    'hash_pitagoras_05'
  ),
  (
    'eeee0001-0001-0001-0001-000000000006',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'Triplas pitagóricas son conjuntos de tres enteros (a, b, c) que satisfacen a² + b² = c². Ejemplos: (3,4,5), (5,12,13), (8,15,17). Euclides demostró que existen infinitas triplas. La fórmula paramétrica general es: a = m² - n², b = 2mn, c = m² + n², donde m > n > 0.',
    5,
    68,
    'active',
    'material',
    'hash_pitagoras_06'
  ),
  (
    'eeee0001-0001-0001-0001-000000000007',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'La tensión filosófica: Pitágoras creía que los números eran la esencia de toda realidad. El descubrimiento de que √2 no es racional (no puede expresarse como fracción de enteros) aparentemente contradecía esta visión. Este descubrimiento, atribuido a Hipaso de Metaponto, supuestamente causó una crisis en la escuela pitagórica.',
    6,
    82,
    'active',
    'material',
    'hash_pitagoras_07'
  ),
  (
    'eeee0001-0001-0001-0001-000000000008',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccc0001-0001-0001-0001-000000000001',
    'pitagoras_teorema.md',
    'En espacios no euclidianos, el teorema de Pitágoras no se cumple. En geometría hiperbólica o esférica, las relaciones entre lados de triángulos son diferentes. Esto nos hace preguntar: ¿es el teorema una verdad universal, o solo una propiedad del espacio euclidiano que habitamos?',
    7,
    75,
    'active',
    'material',
    'hash_pitagoras_08'
  )
ON CONFLICT (id) DO NOTHING;

-- Verificación
SELECT 'Academia Pitágoras: ' || COUNT(*) as academies FROM public.academies WHERE slug = 'pitagoras';
SELECT 'Espacios: ' || COUNT(*) as spaces FROM public.academy_spaces WHERE academy_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT 'Ejes: ' || COUNT(*) as axes FROM public.thematic_axes WHERE academy_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT 'Fragmentos RAG: ' || COUNT(*) as fragments FROM public.corpus_fragments WHERE academy_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
