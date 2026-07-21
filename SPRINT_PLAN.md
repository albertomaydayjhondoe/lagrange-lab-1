# 🚀 SPRINT PLAN - Lagrange Lab Deployment
## Estado: ~85% Operativo → Meta: 100%

---

## ✅ COMPLETADO

### Supabase Database (100%)
- ✅ RLS recursion fixed en `academy_members`
- ✅ RLS recursion fixed en `academies`  
- ✅ RLS fixed en `topology_nodes`
- ✅ Seed data: 3 academies, 5 thematic axes, 3 topology nodes

### Edge Functions (100%)
- ✅ `list-academies` - Funciona correctamente
- ✅ `get-academy` - Funciona correctamente

### Vercel (Build 100%, Access 30%)
- ✅ Build exitoso con Vite
- ✅ Deployment creado
- ⚠️ Vercel Authentication habilitada

---

## 📊 CHECKLIST PORCENTUAL

```
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE DATABASE        ████████████████████████████ 100% │
│  EDGE FUNCTIONS           ████████████████████████████ 100% │
│  RLS POLICIES            ████████████████████████████ 100% │
│  SEED DATA               ████████████████████████████ 100% │
│  VERCEL BUILD            ████████████████████████████ 100% │
│  VERCEL ACCESS           ░░░░░░░░░░░░░░░░░░░░░░░░░░░  30% │
├─────────────────────────────────────────────────────────────┤
│  TOTAL SISTEMA            ████████████████████████░░░░░  85% │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 ACCIÓN REQUERIDA PARA 100%

### 1. Habilitar acceso a Vercel

1. Ir a: **https://vercel.com/dashboard** → proyecto `lagrange-lab-1`
2. **Settings** → **Authentication**
3. Deshabilitar "Vercel Authentication"

### 2. Preview URL

```
https://lagrange-lab-1-jhi2k8065-rojects-c08bb50e.vercel.app
```

### 3. Deploy a Producción

```bash
npx vercel --prod
```

---

## 📋 VERIFICACIÓN APIs

```bash
# List academies
curl "https://naikdjreibbugblihgwl.supabase.co/functions/v1/list-academies"

# Get academy
curl "https://naikdjreibbugblihgwl.supabase.co/functions/v1/get-academy/socrates"

# REST - academies (sin auth)
curl "https://naikdjreibbugblihgwl.supabase.co/rest/v1/academies?select=id,name"
```

---

## 📁 Secrets a configurar (Opcional)

### Supabase Edge Functions:
```
ADMIN_SEED_EMAIL=admin@tudominio.com
ADMIN_SEED_PASSWORD=TuPasswordSeguro123
AI_API_KEY=sk-...
```

### Environment Variables Vercel:
```
VITE_SUPABASE_PROJECT_ID=naikdjreibbugblihgwl
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc
VITE_SUPABASE_URL=https://naikdjreibbugblihgwl.supabase.co
```
