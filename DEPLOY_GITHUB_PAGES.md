# 🚀 Despliegue Independiente en GitHub Pages

## Credenciales Supabase (Producción)

```env
VITE_SUPABASE_URL=https://rwfqswiwalygzfojyeqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3ZnFzd2l3YWx5Z3pmb2p5ZXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODE0NTEsImV4cCI6MjA4MjI1NzQ1MX0.qQ5AqWm-peTqZYXNFMAO2qOLUDkW5Dv2zb6jdwCfmSM
VITE_SUPABASE_PROJECT_ID=rwfqswiwalygzfojyeqk
```

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

## Paso 2: Instalar Dependencias

```bash
npm install
```

## Paso 3: Crear archivo .env.production

Crea un archivo `.env.production` en la raíz del proyecto:

```bash
# .env.production
VITE_SUPABASE_URL=https://rwfqswiwalygzfojyeqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3ZnFzd2l3YWx5Z3pmb2p5ZXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODE0NTEsImV4cCI6MjA4MjI1NzQ1MX0.qQ5AqWm-peTqZYXNFMAO2qOLUDkW5Dv2zb6jdwCfmSM
VITE_SUPABASE_PROJECT_ID=rwfqswiwalygzfojyeqk
```

## Paso 4: Configurar vite.config.ts para GitHub Pages

Actualiza `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  // IMPORTANTE: Cambia 'TU_REPO' por el nombre de tu repositorio
  base: mode === 'production' ? '/TU_REPO/' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
}));
```

## Paso 5: Build de Producción

```bash
npm run build
```

Esto generará la carpeta `dist/` con los archivos estáticos.

## Paso 6: Desplegar en GitHub Pages

### Opción A: Usando gh-pages (Recomendado)

1. Instalar gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Añadir script en package.json:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Ejecutar:
```bash
npm run deploy
```

### Opción B: GitHub Actions (Automático)

Crea el archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Configurar Secrets en GitHub:

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Añade estos secrets:

| Secret Name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | `https://rwfqswiwalygzfojyeqk.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3ZnFzd2l3YWx5Z3pmb2p5ZXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODE0NTEsImV4cCI6MjA4MjI1NzQ1MX0.qQ5AqWm-peTqZYXNFMAO2qOLUDkW5Dv2zb6jdwCfmSM` |
| `VITE_SUPABASE_PROJECT_ID` | `rwfqswiwalygzfojyeqk` |

## Paso 7: Configurar GitHub Pages

1. Ve a Settings → Pages en tu repositorio
2. Source: selecciona "GitHub Actions" (si usas Actions) o "Deploy from a branch" → gh-pages (si usas gh-pages)
3. Guarda los cambios

## Paso 8: Configurar Supabase para el nuevo dominio

Añade tu dominio de GitHub Pages en la configuración de Supabase:

1. Ve a https://supabase.com/dashboard/project/rwfqswiwalygzfojyeqk/auth/url-configuration
2. En "Site URL", añade: `https://TU_USUARIO.github.io/TU_REPO`
3. En "Redirect URLs", añade: `https://TU_USUARIO.github.io/TU_REPO/**`

## 🔗 URLs Importantes

| Recurso | URL |
|---------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/rwfqswiwalygzfojyeqk |
| Edge Functions | https://rwfqswiwalygzfojyeqk.supabase.co/functions/v1/ |
| Storage | https://rwfqswiwalygzfojyeqk.supabase.co/storage/v1/ |
| Auth | https://rwfqswiwalygzfojyeqk.supabase.co/auth/v1/ |

## 🔧 Edge Functions Disponibles

- `socratic-oracle` - Generación de respuestas del oráculo
- `generate-narrative` - Generación de narrativas
- `elevenlabs-tts` - Síntesis de voz
- `ai-nodes`, `ai-edges`, `ai-questions`, `ai-episodes` - IA estructural
- `ai-curate-text`, `ai-dialogue-summary` - Curación de texto
- `podcast-storage` - Almacenamiento de podcasts

## ⚠️ Notas Importantes

1. **La anon key es pública** - Es seguro usarla en el frontend
2. **RLS está habilitado** - Todas las tablas tienen políticas de seguridad
3. **Edge Functions son públicas** - Configuradas con `verify_jwt = false`
4. **El backend sigue funcionando** - Supabase es independiente del proveedor de IA

## 🧪 Verificar Despliegue

Después de desplegar, verifica:

```bash
# Probar conexión a Supabase
curl https://rwfqswiwalygzfojyeqk.supabase.co/rest/v1/topology_nodes?select=id,label&limit=1 \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3ZnFzd2l3YWx5Z3pmb2p5ZXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODE0NTEsImV4cCI6MjA4MjI1NzQ1MX0.qQ5AqWm-peTqZYXNFMAO2qOLUDkW5Dv2zb6jdwCfmSM"
```

Si recibes datos JSON, ¡la conexión funciona!
