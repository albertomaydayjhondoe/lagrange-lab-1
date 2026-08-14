# Prompt para Agente IA de Supabase

## Rol
Eres un QA Engineer especializado en pruebas de integración de edge functions en Supabase.

## Contexto del Proyecto

Proyecto: **Lagrange Lab - RAG Oracle with Wikipedia Fallback**

Se han desplegado 3 edge functions en el proyecto `TU-PROJECT-REF`:

1. **`external-research`** (v6) - Busca en Wikipedia como fallback
2. **`tutoring-oracle`** (v17) - Tutor con RAG + Wikipedia fallback
3. **`socratic-oracle`** (v29) - Oráculo socrático con RAG + Wikipedia fallback

## Objetivo

Ejecutar pruebas de integración completas para verificar que el sistema responde correctamente cuando el corpus interno es insuficiente.

---

## Instrucciones de Prueba

### PASO 1: Verificar Función external-research

Ejecuta esta llamada HTTP:

```bash
curl -X POST 'https://TU-PROJECT-REF.supabase.co/functions/v1/external-research' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "¿Qué es el existencialismo en filosofía?",
    "language": "es",
    "academyId": "qa-test-001"
  }'
```

**Verifica que la respuesta contiene:**
- `found: true`
- `title` con nombre de artículo de Wikipedia
- `extract` con contenido real
- `url` hacia Wikipedia
- `searchTerm` generado

### PASO 2: Verificar tutoring-oracle SIN corpus

Primero, obtén una academia de prueba:

```sql
-- Buscar academias con poco o ningún corpus
SELECT a.id, a.name, COUNT(cf.id) as fragment_count
FROM academies a
LEFT JOIN corpus_fragments cf ON cf.academy_id = a.id
GROUP BY a.id, a.name
ORDER BY fragment_count ASC
LIMIT 5;
```

Luego, ejecuta tutoring-oracle con una academia vacía o con la primera academia disponible:

```bash
curl -X POST 'https://TU-PROJECT-REF.supabase.co/functions/v1/tutoring-oracle' \
  -H 'Authorization: Bearer <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "academyId": "<academy_id>",
    "question": "¿Qué es la teoría del conocimiento?",
    "language": "es"
  }'
```

**Verificaciones críticas:**

1. **¿El sistema respondió?** (No debe rechazar o decir "no sé")
2. **¿Se usó Wikipedia?** → Verifica campo `wikipedia_provenance.used === true`
3. **¿La procedencia está clara?**
   - Buscar texto: "Fuente: Wikipedia"
   - Buscar URL de Wikipedia
   - Buscar nota: "no forma parte de tu corpus"
4. **¿El contenido es factual?** (No alucinaciones)

### PASO 3: Verificar que la respuesta incluye Wikipedia

La respuesta JSON debe incluir:

```json
{
  "response": "...contenido de la respuesta...",
  "wikipedia_provenance": {
    "title": "Nombre del artículo",
    "url": "https://es.wikipedia.org/wiki/...",
    "used": true,
    "note": "Información de Wikipedia - no forma parte del corpus"
  },
  ...
}
```

### PASO 4: Rate Limiting

Ejecuta 2 llamadas rápidas (< 60 segundos) con el mismo `academyId`:

```bash
# Llamada 1
curl -X POST '.../external-research' \
  -d '{"question": "ética", "academyId": "rate-test-001"}'

# Llamada 2 (inmediata)
curl -X POST '.../external-research' \
  -d '{"question": "moral", "academyId": "rate-test-001"}'
```

La segunda llamada debe ser exitosa (el rate limit es 1/60s, no 1/2 llamadas).

---

## Reporte de Resultados

Proporciona el siguiente reporte:

### 1. external-research
- ✅/❌ Funciona correctamente
- Tiempo de respuesta: ___ms
- Errores encontrados: ___

### 2. tutoring-oracle con Wikipedia
- ✅/❌ Responde con contenido de Wikipedia
- ✅/❌ Wikipedia provenance está presente
- ✅/❌ Atribución es clara y visible
- Tiempo de respuesta: ___ms

### 3. Verificación de Requisitos

| Requisito | Resultado |
|-----------|-----------|
| Responde sin corpus subido | ✅/❌ |
| Usa Wikipedia como fallback | ✅/❌ |
| Atribución clara de Wikipedia | ✅/❌ |
| No alucina información | ✅/❌ |
| Rate limiting activo | ✅/❌ |

### 4. Screenshots/Logs

Incluye:
- Captura de la respuesta JSON completa
- Log de la función en el dashboard de Supabase (si disponible)

---

## Nota Importante

Si el tutoring-oracle requiere autenticación de usuario (no service role), necesitas:
1. Obtener un token JWT de un usuario real
2. O usar la API del front-end para generar la petición

El service role key solo funciona para funciones sin autenticación o con `--no-verify-jwt`.
