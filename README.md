# 🧮 Lagrange Lab

> Plataforma de aprendizaje socrático con academias multi-tenant, tutorías con IA, y sistema RAG (Retrieval-Augmented Generation) para contexto semántico vivo.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Supabase](https://img.shields.io/badge/Supabase-v2-orange)](https://supabase.com)

## 🎯 Visión del Sistema

**Lagrange Lab** es una plataforma educativa que implementa un modelo de aprendizaje socrático-potencial. A diferencia de sistemas educativos tradicionales que proporcionan respuestas, Lagrange Lab guía a los estudiantes a través de preguntas que despiertan su potencial cognitivo.

### Componentes Core

| Componente | Descripción | Estado |
|------------|-------------|--------|
| **ResearchLab** | Sistema RAG multi-formato para investigación | ✅ Funcional |
| **Socratic Oracle** | Genera preguntas socráticas con contexto | ✅ Funcional |
| **Tutoring Oracle** | Chat de tutorías con materiales RAG | ✅ Funcional |
| **External Research** | Wikipedia fallback para contexto amplio | ✅ Funcional |
| **Academies** | Sistema multi-tenant con membresías | ✅ Funcional |
| **Topology** | Mapa de conocimiento vivo | 🔄 En desarrollo |

## 📐 Arquitectura

```
lagrange-lab-1/
├── src/
│   ├── aplicacion/           # App principal y rutas
│   ├── caracteristicas/      # Módulos de funcionalidad
│   │   ├── academia/         # Gestión de academias
│   │   ├── administracion/    # Panel de admin
│   │   ├── autenticacion/     # Auth y perfiles
│   │   ├── oraculo/          # Oráculo socrático
│   │   ├── podcast/          # Generación de podcasts
│   │   ├── rag/              # Chat con materiales
│   │   ├── research/         # ResearchLab (principal)
│   │   ├── topologia/        # Mapa de conocimiento
│   │   └── tutorias/         # Sistema de tutorías
│   ├── compartico/           # Componentes compartidos (shadcn/ui)
│   ├── config/               # Prompts y configuración
│   ├── data/                 # Datos estáticos
│   ├── hooks/                # React hooks personalizados
│   ├── integrations/         # Integraciones externas
│   ├── lib/                  # Supabase client y utilities
│   └── pages/                # Páginas principales
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   │   ├── _shared/         # Código compartido entre funciones
│   │   ├── socratic-oracle/ # Genera preguntas socráticas con RAG
│   │   ├── tutoring-oracle/ # Chat de tutorías con RAG
│   │   ├── ingest-source/   # Procesa materiales y genera embeddings
│   │   ├── match_corpus_fragments/ # Búsqueda vectorial
│   │   ├── external-research/ # Wikipedia fallback
│   │   ├── book-session/    # Reserva de tutorías
│   │   ├── create-session/  # Crear sesión de tutoría
│   │   ├── list-sessions/  # Listar sesiones disponibles
│   │   └── [20+ funciones]
│   ├── migrations/          # Schema SQL y seeds
│   └── config.toml          # Configuración de Supabase
├── public/                   # Assets estáticos
└── vercel.json              # Configuración Vercel
```

## 🗄️ Esquema de Base de Datos

### Tablas Core
| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `academies` | Academias multi-tenant con owner y configuración | ✅ |
| `academy_members` | Membresías con roles (admin, member, tutor) | ✅ |
| `profiles` | Perfiles extendidos con roles de tutoría | ✅ |
| `platform_admins` | Administradores de plataforma | ✅ |

### Topología y Corpus
| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `topology_nodes` | Nodos del mapa de conocimiento | ✅ |
| `topology_edges` | Conexiones entre nodos | ✅ |
| `corpus_fragments` | Fragmentos con embeddings vector(1536) | ✅ |
| `socratic_questions` | Preguntas socráticas por eje | ✅ |
| `saved_dialogues` | Conversaciones guardadas | ✅ |

### Tutorías y Educación
| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `subjects` | Materias (concepto unificado) | ✅ |
| `topics` | Temas dentro de cada materia | ✅ |
| `materials` | Materiales educativos con embeddings | ✅ |
| `tutoring_sessions` | Sesiones programadas | ✅ |
| `session_bookings` | Reservas de estudiantes | ✅ |
| `tutoring_history` | Historial de interacciones IA | ✅ |
| `tutor_availability` | Disponibilidad de tutores | ✅ |
| `subscriptions` | Suscripciones de usuarios | ✅ |

## ⚡ Edge Functions

| Función | Auth | Descripción |
|---------|------|-------------|
| `socratic-oracle` | JWT | Genera pregunta socrática con contexto RAG |
| `tutoring-oracle` | JWT | Chat de tutoría con materiales |
| `ingest-source` | JWT | Procesa materiales y genera embeddings |
| `external-research` | JWT | Wikipedia fallback para contexto |
| `match_corpus_fragments` | RPC | Búsqueda vectorial |
| `list-academies` | ❌ | Lista academias públicas |
| `get-academy` | ❌ | Detalle de academia |
| `list-sessions` | ❌ | Lista sesiones disponibles |
| `book-session` | JWT | Reserva una sesión |
| `create-session` | JWT | Crea sesión de tutoría |
| `save-dialogue` | JWT | Guarda conversación |
| `fog-teaser` | JWT | Genera teaser de niebla |
| `generate-ambient-narrative` | JWT | Narrativa ambiental |

## 🔐 Modelo de Seguridad

### RLS (Row Level Security)
Todas las tablas tienen RLS habilitado con políticas específicas por rol:
- **Owner**: Acceso completo a su academia
- **Admin**: Gestión de miembros y contenido
- **Member**: Acceso a materiales y conversaciones
- **Tutor**: Gestión de sesiones y disponibilidad

### Prevención de Recursión
```sql
-- Funciones helper con SECURITY DEFINER
CREATE FUNCTION user_is_academy_member(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM academy_members 
    WHERE academy_id = p_academy_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

## 🚀 Desarrollo Local

### Requisitos
- Node.js 18+
- npm o bun
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Cuenta de Supabase (gratuita)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/albertomaydayjhondoe/lagrange-lab-1.git
cd lagrange-lab-1

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Desarrollo con Vite
npm run dev
```

### Variables de Entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-publishable-key
```

### Scripts Disponibles

```bash
npm run dev          # Desarrollo local (puerto 5173)
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linting con ESLint
npm run lint:fix     # Fix automático de linting
```

### Supabase Local

```bash
# Iniciar Supabase local
npx supabase start

# Ver status
npx supabase status

# Reset base de datos
npx supabase db reset

# Aplicar migraciones
npx supabase db push
```

## 🌐 Deploy

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy producción
vercel --prod
```

### Supabase (Backend)

```bash
# Login a Supabase
npx supabase login

# Link al proyecto
npx supabase link --project-ref Naikdjreibbugblihgwl

# Push migraciones
npx supabase db push

# Deploy edge functions
npx supabase functions deploy

# Deploy función específica
npx supabase functions deploy socratic-oracle
```

### Secrets Requeridos (Supabase)

```bash
# AI API Key (OpenAI o compatible)
supabase secrets set AI_API_KEY=sk-...

# Opcional: Seeds
supabase secrets set ADMIN_SEED_EMAIL=admin@example.com
supabase secrets set ADMIN_SEED_PASSWORD=TuPasswordSeguro123
```

## 📊 Estado de Sprint

| Sprint | Descripción | Estado |
|--------|-------------|--------|
| 1-5 | Core functionality | ✅ Completado |
| 6 | RLS Security | 🔄 En proceso |
| 7 | Deploy & Infra | ⬜ Pendiente |
| 8 | Unificación materias | ⬜ Pendiente |
| 9 | Testing & QA | ⬜ Pendiente |
| 10 | Documentación | ⬜ Pendiente |

Ver [SPRINTS_MODULAR_PLAN.md](SPRINTS_MODULAR_PLAN.md) para detalles.

## 🔧 Troubleshooting

### "Bad Gateway" en Vercel
1. Verificar que `vercel.json` tiene `outputDirectory: "dist"`
2. Verificar variables de entorno en Vercel dashboard
3. Revisar logs: `vercel logs`

### Edge Functions no responden
1. Verificar secrets en Supabase: `supabase secrets list`
2. Verificar logs: `supabase functions logs <nombre-funcion>`

### RLS deniega acceso
1. Verificar policies: `SELECT * FROM pg_policies WHERE schemaname = 'public'`
2. Verificar que el usuario tiene membresía en la academia

## 📝 Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para historial completo de cambios.

## 🤝 Contribuir

1. Fork el repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Añadir nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE)

## 🙏 Credits

- [Supabase](https://supabase.com) - Backend como servicio
- [Vercel](https://vercel.com) - Hosting frontend
- [shadcn/ui](https://ui.shadcn.com) - Componentes UI
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS
- [Framer Motion](https://www.framer.com/motion/) - Animaciones

