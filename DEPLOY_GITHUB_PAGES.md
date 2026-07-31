# 🚀 Despliegue Independiente en GitHub Pages

## Credenciales Supabase (Producción)

```env
VITE_SUPABASE_URL=https://naikdjreibbugblihgwl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc
VITE_SUPABASE_PROJECT_ID=naikdjreibbugblihgwl
```

> ⚠️ **IMPORTANT**: This project reference is `naikdjreibbugblihgwl`. All Supabase Edge Functions (including AI functions) are deployed to this project. DO NOT use a different project reference - AI functions will fail.

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

## Paso 2: Instalar Dependencias

```bash
npm install
```

## Paso 3: Build y Deploy

### Opción A: Script automatizado (Recomendado)

```bash
./deploy-ghpages.sh
```

### Opción B: Manual

```bash
# Build para GitHub Pages (con base path /lagrange-lab-1/)
npm run build:ghpages

# Copiar archivos de github-pages/ a dist/
cp -r github-pages/* dist/

# Desplegar (asegúrate de que gh-pages esté instalado)
npm install --save-dev gh-pages
npm run deploy:ghpages
```

## Paso 4: Configurar GitHub Pages en GitHub

1. Ve a tu repositorio en GitHub
2. Ve a Settings → Pages
3. Source: selecciona "Deploy from a branch" → **gh-pages** / (root)
4. Guarda los cambios

## Paso 5: Configurar Supabase para el nuevo dominio

Añade tu dominio de GitHub Pages en la configuración de Supabase:

1. Ve a https://supabase.com/dashboard/project/naikdjreibbugblihgwl/auth/url-configuration
2. En "Site URL", añade: `https://albertomaydayjhondoe.github.io/lagrange-lab-1`
3. En "Redirect URLs", añade: `https://albertomaydayjhondoe.github.io/lagrange-lab-1/**`

## 🔗 URLs Importantes

| Recurso | URL |
|---------|-----|
| GitHub Pages | https://albertomaydayjhondoe.github.io/lagrange-lab-1 |
| Supabase Dashboard | https://supabase.com/dashboard/project/naikdjreibbugblihgwl |
| Edge Functions | https://naikdjreibbugblihgwl.supabase.co/functions/v1/ |
| Storage | https://naikdjreibbugblihgwl.supabase.co/storage/v1/ |
| Auth | https://naikdjreibbugblihgwl.supabase.co/auth/v1/ |

## 🔧 Edge Functions Disponibles

- `socratic-oracle` - Generación de respuestas del oráculo
- `tutoring-oracle` - Tutoría con IA socrático
- `external-research` - Investigación externa con Tavily
- `book-session`, `create-session`, `list-sessions`, `cancel-booking` - Gestión de tutorías
- `process-payment` - Procesamiento de pagos

## ⚠️ Notas Importantes

1. **La anon key es pública** - Es seguro usarla en el frontend
2. **RLS está habilitado** - Todas las tablas tienen políticas de seguridad
3. **Edge Functions son públicas** - Configuradas con `verify_jwt = false`
4. **El backend sigue funcionando** - Supabase es independiente del proveedor de IA
5. **GitHub Pages usa hash routing** - Las rutas como `/tutorias` se convierten en `/#/tutorias`

## 🧪 Verificar Despliegue

```bash
# Probar conexión a Supabase
curl https://naikdjreibbugblihgwl.supabase.co/rest/v1/topology_nodes?select=id,label&limit=1 \
  -H "apikey: sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc"
```

Si recibes datos JSON, ¡la conexión funciona!
