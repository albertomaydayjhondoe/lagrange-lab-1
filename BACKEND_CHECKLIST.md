# Backend Checklist — Lagrange Lab

**Fecha:** 2026-07-26  
**Proyecto Ref:** TU-PROJECT-REF

---

## 1. Base de Datos

### 1.1 Esquema

| Check | Estado | Detalle |
|-------|--------|---------|
| Tablas existentes | ✅ 27 | `information_schema.tables WHERE table_schema='public'` |
| RLS habilitado | ✅ 27/27 | `relrowsecurity = true` en todas |
| Índices vectoriales | ✅ | `corpus_fragments.embedding` existe |
| Trigger end_at | ✅ | `trg_update_end_at` en `tutoring_sessions` |

### 1.2 Tablas Tutorías (Sprint 2)

| Tabla | Creada | RLS |
|-------|--------|-----|
| subjects | ✅ | ✅ |
| topics | ✅ | ✅ |
| materials | ✅ | ✅ |
| tutoring_sessions | ✅ | ✅ |
| session_bookings | ✅ | ✅ |
| payments | ✅ | ✅ |
| tutoring_history | ✅ | ✅ |
| tutor_availability | ✅ | ✅ |
| subscriptions | ✅ | ✅ |

### 1.3 Políticas RLS

| Métrica | Valor |
|---------|-------|
| Total policies | 74 |
| Policies INSERT | 15 |
| Policies abiertas (with_check='true') | 1 (`access_requests` - intencional) |

**Policies abiertas verificadas:**

| Tabla | Policy | ¿Intencional? |
|-------|--------|----------------|
| access_requests | Anyone can submit access request | ✅ Sí (solicitudes de acceso) |
| ~~academies~~ | ~~Anyone can create academies~~ | ❌ **CORREGIDO** → `owner_user_id = auth.uid()` |
| ~~topology_nodes~~ | ~~Authenticated users can insert~~ | ❌ **CORREGIDO** → eliminada, solo admins |

---

## 2. Edge Functions

### 2.1 Inventario

| Función | Status | JWT | Probada |
|---------|--------|-----|---------|
| socratic-oracle | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| tutoring-oracle | ACTIVE v14 | ❌ | ⚠️ Requiere auth |
| ingest-source | ACTIVE v13 | ❌ | ⚠️ Requiere auth |
| match_corpus_fragments | RPC | N/A | ✅ (función SQL) |
| match_tutoring_sessions | RPC | N/A | ✅ (creada Sprint 3) |
| list-academies | ACTIVE v11 | ❌ | ✅ 200 OK |
| list-sessions | ACTIVE v11 | ❌ | ⚠️ Bug full_name→display_name |
| get-academy | ACTIVE v11 | ❌ | ✅ 200 OK |
| book-session | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| create-session | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| cancel-booking | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| process-payment | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| fog-teaser | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| generate-ambient-narrative | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| regenerate-topology-delta | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| ai-curate-text | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| ai-dialogue-summary | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| ai-edges | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| ai-episodes | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| ai-nodes | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| ai-questions | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| eco-oracle | ACTIVE v10 | ✅ | ⚠️ Requiere auth |
| elevenlabs-tts | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| podcast-storage | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| save-dialogue | ACTIVE v13 | ❌ | ⚠️ Requiere auth |
| sync-corpus | ACTIVE v11 | ✅ | ⚠️ Requiere auth |
| seed-platform-owner | ACTIVE v11 | ❌ | ⚠️ Uso único |
| exec-sql | ACTIVE v11 | ❌ | ⚠️ Peligrosa |
| fix-rls | ACTIVE v11 | ❌ | ⚠️ Peligrosa |

**Total: 26 funciones**

### 2.2 Fix Pendiente

| Archivo | Bug | Fix |
|---------|-----|-----|
| `list-sessions/index.ts:87` | `profiles.full_name` no existe | Cambiar a `profiles.display_name` |

---

## 3. Auth & Triggers

| Check | Estado | Detalle |
|-------|--------|---------|
| handle_new_user | ✅ | Crea perfil + asigna rol 'platon' |
| Trigger on_auth_user_created | ✅ | En auth.users AFTER INSERT |
| user_roles.default | ✅ | 'platon' para nuevos usuarios |
| platform_admins | ✅ | Tabla existe |

---

## 4. API Endpoints Públicos

| Endpoint | Método | Auth | Response |
|----------|--------|------|----------|
| /functions/v1/list-academies | GET | ❌ | ✅ 200 (4 academias) |
| /functions/v1/get-academy | GET | ❌ | ✅ 200 |
| /functions/v1/list-sessions | GET | Opcional | ⚠️ Bug columnas |

---

## 5. Build & Lint

| Check | Estado | Output |
|-------|--------|--------|
| npm install | ✅ | 840 packages |
| npm run build | ✅ | 2154 módulos, 719KB |
| npm run lint | ✅ (warnings) | 15 warnings, 0 errors |

---

## 6. Pendientes de Deploy

| Item | Prioridad | Notas |
|------|-----------|-------|
| list-sessions fix | 🔴 Alta | `full_name` → `display_name` |
| seed-pitagoras | 🟡 Media | Ejecutar para datos de prueba |
| Deploy con Supabase CLI | 🔴 Alta | Requiere instalación de CLI |

---

## 7. Variables de Entorno Verificadas

| Variable | Set | Notas |
|----------|-----|-------|
| SUPABASE_URL | ✅ | TU-PROJECT-REF.supabase.co |
| SUPABASE_ANON_KEY | ✅ | Verificada en headers |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Solo en server |
| AI_API_KEY | ✅ | Configurada en Edge Functions |
| AI_GATEWAY_URL | ✅ | https://api.openai.com/v1 |
| AI_CHAT_MODEL | ✅ | gpt-4o-mini |
| AI_EMBEDDING_MODEL | ✅ | text-embedding-3-small |

---

## Checklist de Verificación Manual

- [ ] Crear academia → verificar owner_user_id = auth.uid()
- [ ] Intentar crear academia con owner de otro → debe fallar 403
- [ ] Crear materia en academia "Sócrates" → debe aparecer en subjects y thematic axes
- [ ] Conversar con oráculo → verificar embedding en logs
- [ ] Reservar tutoría → verificar en dashboard del tutor
- [ ] Verificar RLS de subjects para academia pública vs privada

---

**Firmado:** OpenHands Agent — 2026-07-26
