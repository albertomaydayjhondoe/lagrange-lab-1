# Lagrange Lab

Plataforma de aprendizaje socrático con academias multi-tenant, tutorías con IA, y sistema RAG (Retrieval-Augmented Generation) para contexto semántico vivo.

## Sistema

**Academias socráticas + materias**: Cada academia es un espacio de aprendizaje con su propia comunidad, materiales RAG, y conversaciones con el oráculo socrático. Las materias (Subjects/Topics) son el concepto unificado que sirve tanto para tutorías como para el oráculo.

**RAG**: El sistema de Retrieval-Augmented Generation permite subir materiales (PDFs, textos, links) que se procesan con embeddings para buscar contexto semántico relevante antes de generar respuestas.

**Capa viva**: Los materiales, sesiones de tutoría, y el corpus narrativo se actualizan dinámicamente. La topología de nodos y aristas representa el mapa del conocimiento.

## Arquitectura

```
lagrange-lab-1/
├── src/
│   ├── caracteristicas/
│   │   ├── academia/         # Gestión de academias
│   │   ├── administracion/   # Panel de admin
│   │   ├── autenticacion/    # Auth y perfiles
│   │   ├── oraculo/          # Oráculo socrático
│   │   ├── podcast/          # Generación de podcasts
│   │   ├── rag/              # Chat con materiales
│   │   ├── research/         # Investigación
│   │   ├── topologia/        # Mapa de conocimiento
│   │   └── tutorias/         # Sistema de tutorías
│   ├── compartico/           # Componentes compartidos
│   ├── lib/                  # Supabase client
│   └── hooks/                # React hooks
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   │   ├── socratic-oracle/  # Genera preguntas socráticas con RAG
│   │   ├── tutoring-oracle/  # Chat de tutorías con RAG
│   │   ├── ingest-source/    # Procesa materiales y genera embeddings
│   │   ├── match_corpus_fragments/ # Búsqueda vectorial
│   │   ├── book-session/     # Reserva de tutorías
│   │   ├── create-session/   # Crear sesión de tutoría
│   │   ├── list-sessions/    # Listar sesiones disponibles
│   │   └── [otras funciones]
│   └── migrations/           # Schema SQL
└── public/                   # Assets estáticos
```

## Esquema de tablas (information_schema.tables)

### Tablas Core
| Tabla | Descripción |
|-------|-------------|
| `academies` | Academias multi-tenant con owner y configuración |
| `academy_members` | Membresías con roles (admin, member, tutor) |
| `profiles` | Perfiles extendidos con roles de tutoría |
| `platform_admins` | Adminstradores de plataforma |

### Topología
| Tabla | Descripción |
|-------|-------------|
| `topology_nodes` | Nodos del mapa de conocimiento |
| `topology_edges` | Conexiones entre nodos |
| `thematic_axes` | Ejes temáticos (legacy - migrando a subjects) |

### Corpus y RAG
| Tabla | Descripción |
|-------|-------------|
| `corpus_fragments` | Fragmentos narrativos con embeddings vector(1536) |
| `socratic_questions` | Preguntas socráticas por eje |
| `podcast_episodes` | Episodios de podcast generados |
| `saved_dialogues` | Conversaciones guardadas |

### Tutorías
| Tabla | Descripción |
|-------|-------------|
| `subjects` | Materias (concepto unificado) |
| `topics` | Temas dentro de cada materia |
| `materials` | Materiales educativos con embeddings |
| `tutoring_sessions` | Sesiones programadas |
| `session_bookings` | Reservas de estudiantes |
| `payments` | Pagos mock (Stripe simulado) |
| `tutoring_history` | Historial de interacciones IA |
| `tutor_availability` | Disponibilidad de tutores |
| `subscriptions` | Suscripciones de usuarios |

## Edge Functions

| Función | JWT | Descripción |
|---------|-----|-------------|
| `socratic-oracle` | ✅ | Genera pregunta socrática con contexto RAG |
| `tutoring-oracle` | ✅ | Chat de tutoría con materiales |
| `ingest-source` | ✅ | Procesa materiales y genera embeddings |
| `match_corpus_fragments` | ✅ | RPC de búsqueda vectorial |
| `list-academies` | ❌ | Lista academias públicas |
| `get-academy` | ❌ | Detalle de academia |
| `list-sessions` | ❌ | Lista sesiones disponibles |
| `book-session` | ✅ | Reserva una sesión |
| `create-session` | ✅ | Crea sesión de tutoría |
| `cancel-booking` | ✅ | Cancela reserva |
| `process-payment` | ✅ | Procesa pago mock |
| `regenerate-topology-delta` | ✅ | Regenera delta de topología |
| `fog-teaser` | ✅ | Genera teaser de niebla |
| `generate-ambient-narrative` | ✅ | Narrativa ambiental |
| `oracle-echo` | ✅ | Eco del oráculo |
| `ai-*` | ✅ | Múltiples funciones de IA |

## Changelog de decisiones clave

### Fusión de ejes + materias → "materia" como concepto único
- **Antes**: `thematic_axes` era un catálogo separado del modelo de tutorías (`subjects`)
- **Decisión**: Unificar en `subjects` con `academy_id` para scope de academia
- **Impacto**: Una materia creada en una academia aparece como opción de eje en el oráculo y como materia reservable en tutorías

### Modelo de owner de plataforma (platform_admins)
- **Antes**: Sin mecanismo para admins de plataforma
- **Decisión**: Crear tabla `platform_admins` separada de `profiles`
- **RLS**: SELECT en `platform_admins` requiere membership en academia con rol admin

### RLS recursion fix
- **Problema**: Policies con subqueries a `academy_members` causaban recursión infinita
- **Solución**: Usar `WITH SECURITY DEFINER` en funciones helper + RLS bypass en contextos seguros

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Desarrollo con Vite
npm run dev

# Build producción
npm run build

# Lint
npm run lint

# Reset base de datos local (requiere CLI de Supabase)
npx supabase db reset

# Aplicar migraciones locales
npx supabase db push
```

## Deploy

### Supabase (Backend)
```bash
# Link al proyecto
npx supabase link --project-ref <project-ref>

# Push migraciones a producción
npx supabase db push

# Deploy edge functions
npx supabase functions deploy
```

### Vercel (Frontend)
```bash
# Deploy preview
npx vercel

# Deploy producción
npx vercel --prod
```

### Variables de entorno requeridas

**Vercel:**
```
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

**Supabase Edge Functions (Secrets):**
```
AI_API_KEY=sk-...
```

## Proyecto

- **Supabase**: `naikdjreibbugblihgwl`
- **Vercel**: `lagrange-lab-1`

