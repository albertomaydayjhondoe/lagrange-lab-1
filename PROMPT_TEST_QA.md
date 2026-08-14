# Prompt de Prueba: External Research (Wikipedia Fallback)

## Contexto del Sistema

Se ha implementado un fallback externo (Wikipedia) para el pipeline RAG de los oráculos/tutores de la plataforma Lagrange Lab. El flujo es:

```
Usuario pregunta → RAG interno (similarity) → 
    ├─ similarity >= 0.75 → Solo contexto interno
    └─ similarity < 0.75 → Wikipedia fallback → Combina + procedencia
```

## Funciones Desplegadas

| Función | URL | Estado |
|---------|-----|--------|
| `external-research` | `https://TU-PROJECT-REF.supabase.co/functions/v1/external-research` | ACTIVE v6 |
| `socratic-oracle` | `https://TU-PROJECT-REF.supabase.co/functions/v1/socratic-oracle` | ACTIVE v17 |
| `tutoring-oracle` | `https://TU-PROJECT-REF.supabase.co/functions/v1/tutoring-oracle` | ACTIVE v29 |

---

## Prompts de Prueba Completos

### 1. Prueba Unitaria: external-research (Wikipedia API)

**Objetivo:** Verificar que la edge function external-research funciona correctamente.

```
Eres un QA Engineer. Ejecuta la siguiente prueba en Supabase:

1. Invoca la edge function `external-research` con:
   - question: "¿Qué es el existencialismo?"
   - language: "es"
   - academyId: "qa-test-academy-001"

2. Verifica que la respuesta contiene:
   - "found": true
   - "title": contiene "Existencialismo"
   - "extract": texto con información sobre filosofía existencialista
   - "url": https://es.wikipedia.org/wiki/...
   - "searchTerm": término de búsqueda generado

3. Reporta si la función responde correctamente o si hay errores.
```

---

### 2. Prueba de Integración: tutoring-oracle SIN corpus (flujo completo)

**Objetivo:** Verificar que el tutoring-oracle usa Wikipedia cuando no hay contexto interno.

**Precondición:** Academia existente sin materiales subidos.

```
Eres un QA Engineer. Ejecuta la siguiente prueba de integración en Supabase:

ESCENARIO: Usuario hace pregunta sobre un tema sin corpus en la academia

1. Identifica una academia existente en la base de datos (SELECT id FROM academies LIMIT 1)

2. Verifica que NO hay corpus_fragments para esa academia:
   SELECT COUNT(*) FROM corpus_fragments WHERE academy_id = '<academy_id>'
   (debe ser 0)

3. Invoca tutoring-oracle con:
   - academyId: <academy_id de una academia vacía o existente>
   - question: "¿Qué es la teoría del conocimiento?"
   - language: "es"
   
   NOTA: Si no hay academia vacía, usa cualquier academia - el sistema 
   debería detectar que no hay fragmentos relevantes (similarity < 0.75)
   y hacer fallback a Wikipedia.

4. Verifica en la respuesta:
   - El campo "wikipedia_provenance" existe
   - "wikipedia_provenance.used" = true
   - La respuesta incluye contexto de Wikipedia
   - La respuesta incluye nota de procedencia visible:
     "Fuente: Wikipedia — [título del artículo]"
   
5. VERIFICACIÓN CRÍTICA: La respuesta NO debe ser un rechazo o 
   mensaje de "no tengo información" - debe proporcionar contenido
   real de Wikipedia.

6. Reporta:
   - ¿La función llamó a external-research?
   - ¿Se recibió contexto de Wikipedia?
   - ¿La procedencia está correctamente atribuida?
   - ¿El contenido es factual y no es una alucinación?
```

---

### 3. Prueba de Integración: socratic-oracle SIN corpus

**Objetivo:** Verificar que el socratic-oracle usa Wikipedia para generar preguntas.

```
Eres un QA Engineer. Ejecuta la siguiente prueba en Supabase:

ESCENARIO: Generación de pregunta socrática sin contexto interno

1. Obtén un token de autenticación válido de un usuario existente:
   SELECT id, email FROM auth.users LIMIT 1

2. Invoca socratic-oracle con:
   - academyId: <academy_id de una academia con poco/no contenido>
   - language: "es"
   - eje: "epistemología" (o cualquier eje disponible)
   - nivel: "avanzado"
   - context: "genérica" (no específica del corpus)

3. Verifica en la respuesta:
   - "wikipedia_provenance" existe y está presente
   - La pregunta generada usa contexto de Wikipedia
   - El system prompt incluye "INFORMACIÓN COMPLEMENTARIA DE WIKIPEDIA"

4. Reporta si Wikipedia fue usado como fallback.
```

---

### 4. Prueba de Rate Limiting

**Objetivo:** Verificar que el rate limiting funciona.

```
Eres un QA Engineer. Ejecuta la siguiente prueba:

1. Invoca external-research 3 veces seguidas con el mismo academyId:
   - academyId: "rate-limit-test-001"
   - question: "¿Qué es la lógica?"
   - language: "es"

2. Después de 2 llamadas exitosas, la 3ª debería ser:
   - ÉXITO si han pasado más de 60 segundos
   - RATE LIMITED si han pasado menos de 60 segundos
   
   Para probar rate limiting real, haz las 3 llamadas en < 60 segundos.

3. Verifica que el rate limiting usa Supabase RPC:
   SELECT * FROM system_limits WHERE key LIKE '%external_research%'
```

---

### 5. Prueba de Degradación con Gracia

**Objetivo:** Verificar que el sistema no rompe cuando Wikipedia falla.

```
Eres un QA Engineer. Prueba el manejo de errores:

ESCENARIO 1: Término de búsqueda sin resultados en Wikipedia
1. Invoca external-research con un término muy específico/niche:
   - question: "xywz123456789xyz_nonexistent_topic_abc"
   - language: "es"
   - academyId: "test"

2. Verifica que la respuesta es:
   - { "found": false, "error": "No se encontraron resultados" }
   - NO lanza excepción ni error HTTP 500

ESCENARIO 2: Wikipedia API no disponible
- No hay forma directa de probar esto, pero verifica que el código
  tiene try/catch apropiado en external-research/index.ts
```

---

### 6. Prueba de Atribución Correcta (Requisito CRÍTICO)

**Objetivo:** Verificar que el contenido de Wikipedia está claramente diferenciado.

```
Eres un QA Engineer. Ejecuta la prueba de atribución:

1. Invoca tutoring-oracle sin corpus (prueba 2)

2. En la respuesta, busca:
   ✓ Nota de procedencia: "Fuente: Wikipedia — [título]"
   ✓ URL visible: "https://es.wikipedia.org/wiki/..."
   ✓ Advertencia clara: "no forma parte de tu corpus subido"
   ✓ Distinción visual del contenido de Wikipedia

3. La respuesta DEBE tener formato similar a:
   ```
   [Contenido de la respuesta con información de Wikipedia]
   
   ---
   📚 Fuente complementaria: Wikipedia — Ética
   URL: https://es.wikipedia.org/wiki/Ética
   Nota: Este contexto proviene de Wikipedia y no forma parte 
         de los materiales subidos a tu academia.
   ```

4. Reporta si la atribución es clara y distinguishable.
```

---

## Checklist de Verificación

| # | Verificación | Estado | Notas |
|---|-------------|--------|-------|
| 1 | external-research responde correctamente | ☐ | |
| 2 | tutoring-oracle usa Wikipedia fallback | ☐ | |
| 3 | socratic-oracle usa Wikipedia fallback | ☐ | |
| 4 | Rate limiting funciona (60s por academia) | ☐ | |
| 5 | Graceful degradation cuando no hay resultados | ☐ | |
| 6 | Atribución clara de contenido Wikipedia | ☐ | |
| 7 | No alucinaciones en respuestas | ☐ | |
| 8 | Respuesta útil incluso sin corpus | ☐ | |

---

## Comandos SQL Útiles para Verificación

```sql
-- 1. Ver academias disponibles
SELECT id, name FROM academies;

-- 2. Verificar corpus vacío en una academia
SELECT COUNT(*) FROM corpus_fragments WHERE academy_id = '<id>';

-- 3. Ver logs de funciones (si disponibles)
-- En el dashboard de Supabase: Functions > external-research > Logs

-- 4. Verificar rate limits en memoria
-- Los rate limits se almacenan en memoria del edge function,
-- no en la base de datos.
```

---

## Resultado Esperado

Al ejecutar las pruebas, el sistema debe:

1. ✅ Responder preguntas sobre temas sin corpus subido
2. ✅ Usar Wikipedia como fuente de respaldo verificable
3. ✅ Atribuir claramente el contenido de Wikipedia
4. ✅ No rechazar ni alucinar cuando no hay contexto interno
5. ✅ Limitar llamadas a Wikipedia (1 por academia/60s)
6. ✅ Manejar errores de Wikipedia con gracia
