# 🚀 Deployment Checklist - Academia Lexis MVP

## ✅ Completado Automáticamente

| Tarea | Estado |
|-------|--------|
| Edge Functions desplegadas | ✅ |
| `socratic-oracle` | ✅ |
| `list-academies` | ✅ |
| Frontend Build | ✅ |
| CI/CD Workflow | ✅ |

## ⚠️ Requiere Configuración Manual

### 1. Configurar Secrets de AI en Supabase

**Ir a:** https://supabase.com/dashboard/project/TU-PROJECT-REF/functions/secrets

**Agregar estos secretos:**

| Name | Value |
|------|-------|
| `AI_API_KEY` | _(tu OpenAI API key)_ |
| `AI_GATEWAY_URL` | `https://api.openai.com/v1` |
| `AI_CHAT_MODEL` | `gpt-4o-mini` |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` |

### 2. Configurar Variables de Entorno en Vercel

**Ir a:** https://vercel.com/dashboard → Proyecto → Settings → Environment Variables

**Variables requeridas para el MVP:**

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://TU-PROJECT-REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | _(de Supabase Settings > API)_ |
| `VITE_SUPABASE_PROJECT_ID` | `TU-PROJECT-REF` |

**Feature Flags (opcional):**

| Name | Value | Descripción |
|------|-------|-------------|
| `VITE_FEATURE_PODCAST` | `false` | Podcast educativo |
| `VITE_FEATURE_TOPOLOGIA` | `false` | Topología del conocimiento |
| `VITE_FEATURE_RESEARCH` | `false` | Research Lab |
| `VITE_FEATURE_PITAGORAS` | `false` | Pitágoras Lab |
| `VITE_FEATURE_TUTORIAS_TUTOR` | `false` | Tutorías con tutor humano |
| `VITE_FEATURE_ADMIN_AVANZADO` | `false` | Panel admin avanzado |

### 3. Ejecutar Migraciones en Supabase

**Ir a:** https://supabase.com/dashboard/project/TU-PROJECT-REF/sql/new

**Ejecutar en orden (migraciones del MVP):**

1. `supabase/migrations/20260727000000_sprint8_unify_subjects_academy.sql` - Unificación de materias
2. `supabase/migrations/20260727000001_sprint9_security_rls.sql` - Seguridad RLS
3. `supabase/migrations/20260731000000_seed_academia_lexis_paau.sql` - Seed Academia Lexis

## 🌐 URLs del Proyecto

| Servicio | URL |
|----------|-----|
| **Producción** | https://lagrange-lab-1.vercel.app |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/TU-PROJECT-REF |
| **Edge Functions** | https://supabase.com/dashboard/project/TU-PROJECT-REF/functions |
| **Function Secrets** | https://supabase.com/dashboard/project/TU-PROJECT-REF/functions/secrets |
| **GitHub Repository** | https://github.com/albertomaydayjhondoe/lagrange-lab-1 |

## ✅ Verificación Post-Deploy

### 1. Probar el Flujo MVP:
```
1. Auth → registro/login
2. Ver Academia Lexis (única academia visible)
3. Ver materias PAAU (Lengua, Historia, Matemáticas, etc.)
4. Aportar Apuntes → subir material
5. Ir al Oráculo → hacer pregunta
6. Verificar respuesta con provenance
```

### 2. Verificar Placeholders:
```
- /podcast → "Próximamente en Academia Lexis"
- /research → "Próximamente en Academia Lexis"
- /admin → "Próximamente en Academia Lexis"
```

### 3. Reactivar Módulos (futuro):
Para activar cualquier módulo dummy, cambiar el feature flag correspondiente a `true` en Vercel y hacer redeploy.

## 🔧 Troubleshooting

### Bad Gateway en producción
1. Verificar que las variables VITE_SUPABASE_* están configuradas en Vercel
2. Hacer redeploy: `vercel --prod`

### Edge Functions no responden
1. Verificar que AI_API_KEY está configurada en Supabase Functions Secrets
2. Revisar logs en Supabase Dashboard → Functions → [función] → Logs

### Módulos placeholder no aparecen
1. Verificar que el build es reciente (rebuild si necesario)
2. Verificar que el navegador no tiene caché antiguo
