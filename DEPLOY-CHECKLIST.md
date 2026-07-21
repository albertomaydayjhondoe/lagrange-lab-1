# 🚀 Deployment Checklist

## ✅ Completado Automáticamente

| Tarea | Estado |
|-------|--------|
| Edge Functions desplegadas | ✅ |
| `ingest-source` | ✅ |
| `tutoring-oracle` | ✅ |
| `save-dialogue` | ✅ |
| Frontend Build | ✅ |
| CI/CD Workflow | ✅ |

## ⚠️ Requiere Configuración Manual

### 1. Configurar Secrets de AI en Supabase

**Ir a:** https://supabase.com/dashboard/project/naikdjreibbugblihgwl/functions/secrets

**Agregar estos secretos:**

| Name | Value |
|------|-------|
| `AI_API_KEY` | _(tu OpenAI API key)_ |
| `AI_GATEWAY_URL` | `https://api.openai.com/v1` |
| `AI_CHAT_MODEL` | `gpt-4o-mini` |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` |

### 2. Configurar Secrets en GitHub Actions

**Ir a:** https://github.com/albertomaydayjhondoe/lagrange-lab-1/settings/secrets/actions

**Agregar estos secretos:**

| Name | Value |
|------|-------|
| `VERCEL_TOKEN` | _(tu Vercel token)_ |
| `VERCEL_ORG_ID` | _(tu Vercel org ID)_ |
| `VERCEL_PROJECT_ID` | _(tu Vercel project ID)_ |
| `SUPABASE_ACCESS_TOKEN` | _(tu Supabase access token)_ |
| `AI_API_KEY` | _(tu OpenAI API key)_ |
| `AI_GATEWAY_URL` | `https://api.openai.com/v1` |
| `AI_CHAT_MODEL` | `gpt-4o-mini` |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` |

### 3. Ejecutar Migraciones en Supabase

**Ir a:** https://supabase.com/dashboard/project/naikdjreibbugblihgwl/sql/new

**Ejecutar el contenido de estos archivos en orden:**

1. `supabase/migrations/20260722000003_update_corpus_fragments_rag_provenance.sql`
2. `supabase/migrations/20260722000004_create_saved_dialogues.sql`

## 🌐 URLs del Proyecto

| Servicio | URL |
|----------|-----|
| **Supabase Dashboard** | https://supabase.com/dashboard/project/naikdjreibbugblihgwl |
| **Edge Functions** | https://supabase.com/dashboard/project/naikdjreibbugblihgwl/functions |
| **Function Secrets** | https://supabase.com/dashboard/project/naikdjreibbugblihgwl/functions/secrets |
| **GitHub Repository** | https://github.com/albertomaydayjhondoe/lagrange-lab-1 |
| **GitHub Actions Secrets** | https://github.com/albertomaydayjhondoe/lagrange-lab-1/settings/secrets/actions |
| **Frontend (GitHub Pages)** | https://albertomaydayjhondoe.github.io/lagrange-lab-1/ |

## ✅ Después de Completar

1. **Probar Edge Functions:**
   - Ir a Supabase Dashboard → Functions
   - Hacer clic en "tutoring-oracle"
   - Usar "Invoke" para probar

2. **Verificar Frontend:**
   - Abrir https://albertomaydayjhondoe.github.io/lagrange-lab-1/
   - Verificar conexión con Supabase

3. **Deployment Automático:**
   - Una vez configurados los GitHub Secrets, el deploy será automático
   - Push a `main` = deploy a Vercel + Supabase
