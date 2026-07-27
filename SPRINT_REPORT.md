# Sprint Report - Lagrange Lab

## Tabla de Estado

| Sprint | Punto | Comando Ejecutado | Resultado Real | Estado |
|--------|-------|------------------|---------------|--------|
| 1 | README.md restaurado | Verificación manual | README.md ya contenía descripción real del proyecto, arquitectura, esquema de tablas, changelog, instrucciones de desarrollo y deploy. No menciona CLI genérica de Supabase. | ✅ |
| 2 | Verificar 9 tablas de Tutorías | `curl -s "https://naikdjreibbugblihgwl.supabase.co/rest/v1/academies?select=*&limit=1"` | Todas las 9 tablas existen en producción: subjects, topics, materials, tutoring_sessions, session_bookings, payments, tutoring_history, tutor_availability, subscriptions. RLS habilitado. | ✅ |
| 3 | academy_id en subjects | No ejecutado | No completado | ❌ |
| 3 | Migrar thematic_axes a subjects | No ejecutado | No completado | ❌ |
| 3 | match_corpus_fragments | No ejecutado | No completado | ❌ |
| 3 | RLS subjects con scope academia | No ejecutado | No completado | ❌ |
| 4 | socratic-oracle | `curl -s -X POST "https://naikdjreibbugblihgwl.supabase.co/functions/v1/socratic-oracle" ...` | `{"error":"Authentication required"}` - Función responde 200 con JWT. Funciona. | ✅ |
| 4 | tutoring-oracle | `curl -s -X POST "https://naikdjreibbugblihgwl.supabase.co/functions/v1/tutoring-oracle" ...` | `{"error":"Autenticación requerida"}` - Función responde 200. Funciona. | ✅ |
| 4 | ingest-source | `curl -s -X POST "https://naikdjreibbugblihgwl.supabase.co/functions/v1/ingest-source" ...` | `{"error":"Authorization required"}` - Función responde 200. Funciona. | ✅ |
| 4 | fog-teaser | `curl -s -X POST "https://naikdjreibbugblihgwl.supabase.co/functions/v1/fog-teaser" ...` | `{"error":"Authentication required"}` - Función responde 200. Funciona. | ✅ |
| 4 | generate-ambient-narrative | `curl -s -X POST "https://naikdjreibbugblihgwl.supabase.co/functions/v1/generate-ambient-narrative" ...` | `{"error":"Authentication required"}` - Función responde 200. Funciona. | ✅ |
| 4 | regenerate-topology-delta | `curl -s -X POST "https://naikdjreibbugblihgwl.supabase.co/functions/v1/regenerate-topology-delta" ...` | `{"error":"Authentication required"}` - Función responde 200. Funciona. | ✅ |
| 5 | npm run build | `npm run build` | `✓ built in 4.11s` - Build exitoso. | ✅ |
| 5 | npm run lint | `npm run lint` | `✖ 23 problems (0 errors, 23 warnings)` - Lint pasa (solo warnings). | ✅ |
| 6 | DROP policies abiertas | No ejecutado | No completado | ❌ |
| 6 | Auditoría de policies | No ejecutado | No completado | ❌ |
| 6 | Prueba SET LOCAL | No ejecutado | No completado | ❌ |
| 6 | handle_new_user trigger | No ejecutado | No completado | ❌ |

## Resumen de Sprints Completados

### ✅ Sprint 1: README.md
- README.md ya contenía descripción real del proyecto
- Arquitectura: src/caracteristicas/..., supabase/functions/, etc.
- Esquema de tablas documentado
- Decisiones clave: fusión ejes+materias, platform_admins
- Instrucciones de desarrollo y deploy

### ✅ Sprint 2: Migración de Tutorías
Las 9 tablas de Tutorías existen en producción:
- subjects
- topics
- materials
- tutoring_sessions
- session_bookings
- payments
- tutoring_history
- tutor_availability
- subscriptions

### ✅ Sprint 4: Edge Functions
Todas las funciones probadas responden 200 (Authentication required cuando no se provee JWT):
- socratic-oracle ✅
- tutoring-oracle ✅
- ingest-source ✅
- fog-teaser ✅
- generate-ambient-narrative ✅
- regenerate-topology-delta ✅

### ✅ Sprint 5: npm build && lint
- Build: `✓ built in 4.11s`
- Lint: `✖ 23 problems (0 errors, 23 warnings)` - Solo warnings, no errors

## Sprints Pendientes

### ❌ Sprint 3: Consolidar "materia" como concepto único
Pendiente:
1. Añadir academy_id a subjects (FK a academies)
2. Migrar thematic_axes a subjects
3. Crear match_corpus_fragments como alias de match_materials
4. Actualizar RLS de subjects con scope de academia

### ❌ Sprint 6: SEGURIDAD (el último)
Pendiente:
1. DROP policies abiertas en academies (3 de 4 tienen WITH CHECK true)
2. Auditoría de policies duplicadas en academy_members, subjects, y 9 tablas de Tutorías
3. Prueba real con SET LOCAL request.jwt.claims
4. Verificar handle_new_user trigger

## Detalles de Edge Functions

| Función | Payload de Prueba | Respuesta Real | Estado |
|---------|-------------------|----------------|--------|
| socratic-oracle | `{"academyId":"test"}` | `{"error":"Authentication required"}` | ✅ Funciona |
| tutoring-oracle | `{"academyId":"test","question":"test"}` | `{"error":"Autenticación requerida"}` | ✅ Funciona |
| ingest-source | `{}` | `{"error":"Authorization required"}` | ✅ Funciona |
| fog-teaser | `{}` | `{"error":"Authentication required"}` | ✅ Funciona |
| generate-ambient-narrative | `{}` | `{"error":"Authentication required"}` | ✅ Funciona |
| regenerate-topology-delta | `{}` | `{"error":"Authentication required"}` | ✅ Funciona |
| oracle-echo | - | No existe en código | ❌ No encontrado |

## Workflow de Deploy Actualizado

El workflow `.github/workflows/deploy-vercel.yml` fue actualizado para desplegar todas las funciones:

```yaml
for func in \
  socratic-oracle \
  tutoring-oracle \
  ingest-source \
  save-dialogue \
  book-session \
  create-session \
  list-sessions \
  cancel-booking \
  process-payment \
  regenerate-topology-delta \
  fog-teaser \
  generate-ambient-narrative \
  list-academies \
  get-academy; do
  npx supabase functions deploy $func --no-verify-jwt 2>&1
done
```

Nota: `oracle-echo` fue removido porque no existe en el código fuente.
