# 🚀 Deploy a Vercel - Instrucciones

## Opción 1: Deploy Automático (Recomendado)

El proyecto ya está configurado con GitHub. Solo necesitas:

1. **Ir a Vercel Dashboard**: https://vercel.com/dashboard
2. **Importar el proyecto** desde GitHub:
   - Click "Add New" → "Project"
   - Selecciona "Import Git Repository"
   - Elige el repo: `albertomaydayjhondoe/lagrange-lab-1`
3. **Configurar entorno** en Vercel:
   - Ve a Settings → Environment Variables
   - Agrega estas variables:

```
VITE_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_KEY
VITE_SUPABASE_PROJECT_ID=TU-PROJECT-REF
```

4. **Deploy automático**: Cada push a `main` disparará un deploy automáticamente.

## Opción 2: Deploy Manual con Vercel CLI

```bash
# 1. Login
vercel login

# 2. Deploy a preview
vercel

# 3. Deploy a producción
vercel --prod
```

## Archivos para el Flowchart

El diagrama Mermaid está disponible en:
- `/flowchart_3niveles.html` - Visor completo
- `/flowchart_3niveles.mmd` - Código Mermaid

## Verificar Deploy

Después del deploy, verifica en:
```
https://lagrange-lab-1.vercel.app/flowchart_3niveles.html
```
