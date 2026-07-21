# Deploy Edge Functions - Manual Steps

## Opción 1: Usando Supabase CLI (Recomendado)

### 1. Instalar Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# Linux
npm install -g supabase

# O usar npx
npx supabase --version
```

### 2. Login a Supabase
```bash
supabase login
```

### 3. Link al proyecto
```bash
cd supabase
supabase link --project-ref naikdjreibbugblihgwl
```

### 4. Desplegar funciones
```bash
# Desplegar todas las funciones
supabase functions deploy

# O desplegar individualmente
supabase functions deploy seed-pitagoras
supabase functions deploy fix-rls
```

---

## Opción 2: Desde Dashboard de Supabase

### 1. Ir al Dashboard
https://supabase.com/dashboard/project/naikdjreibbugblihgwl/functions

### 2. Crear función "seed-pitagoras"
Copiar el contenido de: `supabase/functions/seed-pitagoras/index.ts`

### 3. Invocar la función
```bash
curl -X POST 'https://naikdjreibbugblihgwl.supabase.co/functions/v1/seed-pitagoras' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json'
```

---

## Opción 3: Ejecutar SQL para arreglar RLS

### 1. Ir al SQL Editor
https://supabase.com/dashboard/project/naikdjreibbugblihgwl/sql/new

### 2. Ejecutar este SQL
```sql
-- Fix corpus_fragments RLS
DROP POLICY IF EXISTS "corpus_fragments_select" ON corpus_fragments;
CREATE POLICY "corpus_fragments_select" ON corpus_fragments FOR SELECT USING (true);

DROP POLICY IF EXISTS "corpus_fragments_insert" ON corpus_fragments;
CREATE POLICY "corpus_fragments_insert" ON corpus_fragments FOR INSERT WITH CHECK (true);

-- Seed RAG fragments
INSERT INTO corpus_fragments (id, source_file, source_section, axis, tension, content, keywords, weight, status)
VALUES
  ('eeee0001-0001-0001-0001-000000000001', 'pitagoras_teorema.md', 'Definicion', 
   ARRAY['Demostracion', 'Aplicacion'], 0.8,
   'El Teorema de Pitagoras establece que en un triangulo rectangulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos.',
   ARRAY['pitagoras', 'triangulo', 'hipotenusa'], 1.0, 'active'),
  ('eeee0002-0001-0001-0001-000000000001', 'pitagoras_demostracion.md', 'Areas',
   ARRAY['Demostracion', 'Elegancia'], 0.7,
   'Una demostracion clasica usa areas. Construimos un cuadrado de lado (a+b) y colocamos cuatro copias del triangulo rectangulo.',
   ARRAY['demostracion', 'areas', 'euclides'], 1.0, 'active'),
  ('eeee0003-0001-0001-0001-000000000001', 'pitagoras_triplas.md', 'Triplas',
   ARRAY['Demostracion'], 0.65,
   'Triplas pitagoricas son enteros (a, b, c) con a^2 + b^2 = c^2. Ejemplos: (3,4,5), (5,12,13).',
   ARRAY['triplas', 'euclides', 'infinitas'], 0.9, 'active'),
  ('eeee0004-0001-0001-0001-000000000001', 'pitagoras_historia.md', 'Historia',
   ARRAY['Intuicion'], 0.5,
   'El teorema fue conocido por babilonios, egipcios e indios antes que Pitagoras (~2000 a.C.).',
   ARRAY['historia', 'pitagoricos'], 0.8, 'active'),
  ('eeee0005-0001-0001-0001-000000000001', 'pitagoras_filosofia.md', 'Filosofia',
   ARRAY['Intuicion', 'Elegancia'], 0.9,
   'Tension filosofica: Pitagoras creia que los numeros eran la esencia de toda Realidad. El descubrimiento de que sqrt(2) no es racional causo una crisis.',
   ARRAY['filosofia', 'numeros', 'irracional', 'crisis'], 1.0, 'active'),
  ('eeee0006-0001-0001-0001-000000000001', 'pitagoras_geometria.md', 'NoEuclidiana',
   ARRAY['Intuicion', 'Elegancia'], 0.95,
   'En espacios no euclidianos, el teorema no se cumple. En geometria hiperbolica o esferica.',
   ARRAY['euclidiano', 'hiperbolico', 'esferico'], 1.0, 'active')
ON CONFLICT (id) DO UPDATE SET
  source_file = EXCLUDED.source_file,
  content = EXCLUDED.content;

-- Verify
SELECT id, source_file, source_section FROM corpus_fragments;
```

### 3. Verificar
Deberías ver 6 filas en corpus_fragments.

---

## Verificar Deploy

Después de cualquiera de los métodos anteriores, verifica en:
https://lagrange-lab-1-cyan.vercel.app/#/pitagoras

Deberías ver "6 fragmentos cargados" en lugar de "0 fragmentos cargados".
