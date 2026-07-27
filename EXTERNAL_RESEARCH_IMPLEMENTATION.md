# Implementación: External Research (Wikipedia Fallback)

## Resumen de Cambios

### 1. Nueva Edge Function: `external-research/index.ts`

**Ubicación:** `supabase/functions/external-research/index.ts`

**Funcionalidad:**
- Recibe pregunta del usuario e idioma preferido (es/en)
- Extrae término de búsqueda usando IA ("resume en 1-3 palabras clave")
- Llama a la API pública de Wikipedia (sin API key)
- Devuelve null si no hay resultado (degradación con gracia)
- Rate limiting: 1 llamada por academia cada 60 segundos

**Endpoints de Wikipedia:**
```
Búsqueda: https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=<termino>&format=json
Extracto: https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&titles=<titulo>&format=json
```

### 2. Modificaciones en `socratic-oracle/index.ts`

**Cambios:**
- Añadido threshold de similarity: `EXTERNAL_RESEARCH_SIMILARITY_THRESHOLD = 0.75`
- Después de `fetchCorpusFragmentsWithRAG`, si similarity < 0.75 o no hay resultados:
  - Llama a `external-research`
  - Combina contexto interno (si existe) + contexto de Wikipedia
- Respuesta incluye `wikipedia_provenance` con:
  - `title`, `url`, `used`, `note`

### 3. Modificaciones en `tutoring-oracle/index.ts`

**Cambios:**
- Misma lógica de external research que socratic-oracle
- System prompt incluye contexto de Wikipedia con atribución clara
- Respuesta incluye `wikipedia_provenance`

## Despliegue

### Opción 1: Script automatizado

```bash
cd /workspace/project/lagrange-lab-1
./deploy-external-research.sh
```

### Opción 2: Manual con Supabase CLI

```bash
# Login
npx supabase login

# Link al proyecto
cd supabase
npx supabase link --project-ref naikdjreibbugblihgwl

# Desplegar funciones
npx supabase functions deploy external-research --project-ref naikdjreibbugblihgwl
npx supabase functions deploy socratic-oracle --project-ref naikdjreibbugblihgwl
npx supabase functions deploy tutoring-oracle --project-ref naikdjreibbugblihgwl
```

## Pruebas

### Prueba 1: External Research directo

```bash
curl -X POST 'https://naikdjreibbugblihgwl.supabase.co/functions/v1/external-research' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "¿Qué es la ética en filosofía?",
    "language": "es",
    "academyId": "<academy-id>"
  }'
```

**Respuesta esperada:**
```json
{
  "found": true,
  "searchTerm": "ética filosofía",
  "title": "Ética",
  "extract": "La ética (del griego antiguo...)",
  "url": "https://es.wikipedia.org/wiki/Ética",
  "language": "es",
  "timestamp": "2026-07-27T..."
}
```

### Prueba 2: Tutoring Oracle sin corpus

1. Crear una academia sin material subido
2. Hacer una pregunta sobre un tema general ("¿Qué es la metafísica?")
3. Verificar que:
   - `total_sources` = 0
   - `wikipedia_provenance.used` = true
   - `wikipedia_provenance.title` contiene el artículo de Wikipedia
   - La respuesta menciona la procedencia de Wikipedia

### Prueba 3: Socratic Oracle sin corpus

1. Usar el oráculo socrático en una academia vacía
2. Generar una pregunta
3. Verificar que:
   - `wikipedia_provenance.used` = true
   - El contexto de Wikipedia se usa en el prompt

## Flujo de Decisión

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario pregunta                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│        RAG: match_corpus_fragments (similarity score)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────┐
              │ similarity >= 0.75│
              └─────────┬─────────┘
                    ┌───┴───┐
                   Sí      No
                    │       │
                    ▼       ▼
        ┌───────────────┐  ┌─────────────────────────────────┐
        │ Solo interno  │  │ External Research (Wikipedia)    │
        └───────────────┘  └─────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Wikipedia responde? │
                         └─────────┬───────────┘
                               ┌───┴───┐
                              Sí       No
                               │        │
                               ▼        ▼
                   ┌───────────────┐  ┌──────────────────┐
                   │ Combinar +    │  │ Responder solo   │
                   │ procedencia   │  │ con lo interno   │
                   └───────────────┘  └──────────────────┘
```

## Notas de Procedencia

Cuando se usa Wikipedia, la respuesta incluye:

```
📚 Fuente: Wikipedia — [Título del artículo]
URL: https://es.wikipedia.org/wiki/[Artículo]
Nota: Este contexto NO forma parte de tu corpus subido
```

Esta nota es **siempre visible y distinguible** del contenido interno.

## Rate Limiting

- **external-research:** 1 llamada por academia cada 60 segundos
- **socratic-oracle:** 10 llamadas por usuario/academia por minuto
- **tutoring-oracle:** 20 llamadas por usuario por minuto

## Verificación de Sintaxis

```bash
# Verificar con Deno
export PATH="/home/openhands/.local/bin:$PATH"
deno check --allow-import supabase/functions/external-research/index.ts
deno check --allow-import supabase/functions/socratic-oracle/index.ts
deno check --allow-import supabase/functions/tutoring-oracle/index.ts
```

## Archivos Modificados

1. `supabase/functions/external-research/index.ts` (NUEVO)
2. `supabase/functions/socratic-oracle/index.ts` (MODIFICADO)
3. `supabase/functions/tutoring-oracle/index.ts` (MODIFICADO)
4. `deploy-external-research.sh` (NUEVO)
5. `EXTERNAL_RESEARCH_IMPLEMENTATION.md` (ESTE ARCHIVO)
