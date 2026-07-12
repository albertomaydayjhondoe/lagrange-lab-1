# Sistema Lagrange

Sistema vivo de fricción cognitiva. Genera, muta y reacciona en tiempo real usando IA generativa.

## Arquitectura

```
Frontend (React + Vite)
    ↓
Supabase (Database + Auth + Storage)
    ↓
Edge Functions (Deno)
    ↓
AI Gateway (Lovely API)
```

## Arquitectura Multi-Tenant

Lagrange Lab es una plataforma donde cualquier usuario puede crear su propia "academia socrática" con ejes personalizados, oráculo propio y comunidad.

### Modelo de Datos
```
academies ─────┬──── academy_members (academy_id, user_id, role)
               │
               ├──── thematic_axes
               ├──── topology_nodes
               ├──── topology_edges
               ├──── socratic_questions
               ├──── saved_dialogues
               ├──── podcast_episodes
               ├──── user_interactions
               ├──── access_requests
               └──── corpus_fragments
```

### Roles por Academia
- **owner**: Creador, puede borrar la academia
- **admin**: Puede gestionar miembros y contenido
- **platon**: Ve contenido sin niebla
- **member**: Rol base, ve contenido según fog

### Rutas
- `/academia/:slug` - Academia específica
- `/academies` - Directorio de academias públicas
- `/academies/create` - Crear nueva academia

**Nota**: Las rutas legacy (/map, /lab, etc.) redirigen a `/academia/genesis/`

## Edge Functions

| Función | Propósito |
|---------|-----------|
| `socratic-oracle` | Generador de preguntas socráticas |
| `oracle-echo` | Ecos por silencio del usuario |
| `fog-teaser` | Teasers poéticos para la niebla |
| `generate-ambient-narrative` | Narrativa TTS ambiental |
| `generate-narrative` | Textos narrativos extensos |
| `ai-nodes` | Análisis/generación de nodos |
| `ai-edges` | Análisis/generación de aristas |
| `ai-questions` | Generación de preguntas batch |
| `regenerate-topology-delta` | Delta incremental del grafo |
| `sync-corpus` | Sync corpus a corpus_fragments |
| `list-academies` | Lista academias públicas + membresías |
| `get-academy` | Obtiene academia por slug |

**Nota**: Todas las funciones generativas requieren `academyId` en el body.

## Sistema Vivo - 4 Capas

1. **Mapa como Organismo**: Nodos con vitalidad, animación de aparición
2. **Oráculo Reactivo**: Preguntas contextuales + ecos por silencio
3. **Niebla Dinámica**: Densidad variable + teasers poéticos
4. **Radio Ambiental**: TTS en loop como voz de fondo

## Setup

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Deploy edge functions
npx supabase functions deploy <function-name>

# Aplicar migraciones
npx supabase db push
```

## Variables de Entorno

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LOVABLE_API_KEY=
ELEVENLABS_API_KEY=  # Opcional, para TTS
```

## Fuente Única de Verdad

El tono y reglas del sistema están definidos en:
- `src/config/Lagrange_Architect_Prompt_v2.md` - Documento madre
- `supabase/functions/_shared/architectPrompt.ts` - Código exportado

**Primer Mandamiento**: Si el resultado no incomoda, se descarta.

## Datos Legacy

Archivos históricos en `src/data/_legacy/`:
- `topology/*.json` - Seed para nuevas instalaciones
- `corpus/*.me` - Narrativa fuente (usada por sync-corpus)

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind
- **Backend**: Supabase Edge Functions (Deno)
- **AI**: LoVable API (Gemini)
- **TTS**: ElevenLabs (opcional)

## Ejes de Tensión

| Eje | Pregunta Nuclear |
|-----|------------------|
| Miedo | ¿A quién beneficia tu miedo? |
| Control | ¿Quién escribió las reglas que sigues? |
| Salud Mental | ¿Tu sufrimiento es tuyo o del sistema? |
| Legitimidad | ¿Por qué crees lo que crees? |
| Responsabilidad | ¿Quién paga las consecuencias? |

---

## Arquitectura Multi-Tenant

### Diagrama de Entidades

```
┌─────────────────┐       ┌─────────────────────┐
│    academies     │       │   academy_members    │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │──┐    │ academy_id (FK)     │◄─┐
│ slug            │  │    │ user_id (FK)       │  │
│ name            │  │    │ role               │  │
│ description     │  │    │ joined_at          │  │
│ owner_user_id   │  │    └─────────────────────┘  │
│ is_public       │  │                            │
│ created_at      │  │                            │
└─────────────────┘  │                            │
         │           │         ┌──────────────────┘
         │           │         │
         ▼           ▼         ▼
┌─────────────────────────────────────────────────┐
│            Tablas por Academia                  │
├─────────────────────────────────────────────────┤
│ thematic_axes (academy_id FK)                   │
│ topology_nodes (academy_id FK)                  │
│ topology_edges (academy_id FK)                  │
│ socratic_questions (academy_id FK)              │
│ saved_dialogues (academy_id FK)                 │
│ podcast_episodes (academy_id FK)                 │
│ user_interactions (academy_id FK)               │
│ access_requests (academy_id FK)                 │
│ corpus_fragments (academy_id FK)               │
└─────────────────────────────────────────────────┘
```

### Roles de Academia

| Rol        | Permisos                                      |
|------------|-----------------------------------------------|
| owner      | Crea academias, gestión completa              |
| admin      | Gestión de miembros, contenido                |
| platon     | Puede generar contenido con IA                |
| member     | Acceso de lectura (academias públicas)         |

### Rutas de Academia

| Ruta                        | Descripción                              |
|-----------------------------|------------------------------------------|
| `/academias`                | Listado de academias                     |
| `/academias/crear`          | Wizard de creación                       |
| `/academia/:slug`           | Dashboard de academia                     |
| `/academia/:slug/map`       | Mapa de topología                        |
| `/academia/:slug/admin`     | Panel de administración                   |

---

## Sistema RAG (Retrieval Augmented Generation)

### Flujo de Datos

```
┌──────────────┐    ┌───────────────┐    ┌─────────────────────┐
│   Usuario    │───►│ ingest-source │───►│  corpus_fragments   │
│  sube texto  │    │  Edge Fn      │    │  (con embeddings)   │
└──────────────┘    └───────────────┘    └─────────────────────┘
                          │                        │
                          │                        ▼
                          │              ┌─────────────────────┐
                          │              │  pgvector index     │
                          │              │  (similitud coseno) │
                          │              └─────────────────────┘
                          │                        │
                          ▼                        ▼
                   ┌──────────────┐    ┌─────────────────────┐
                   │ Chunking     │    │  fetchCorpusFragments│
                   │ (parrafos)   │    │  (con query vector) │
                   └──────────────┘    └─────────────────────┘
                          │                        │
                          ▼                        ▼
                   ┌──────────────┐    ┌─────────────────────┐
                   │ Embedding    │    │  socratic-oracle    │
                   │ (ada-002)    │    │  + corpusContext    │
                   └──────────────┘    └─────────────────────┘
```

### corpus_fragments Schema (Extendido)

```sql
corpus_fragments (
  -- Campos originales
  id              UUID PRIMARY KEY,
  source_file     TEXT,
  source_section  TEXT,
  axis            TEXT[],
  tension         REAL,
  content         TEXT,
  keywords        TEXT[],
  weight          REAL,
  
  -- Multi-tenant
  academy_id      UUID REFERENCES academies(id),
  
  -- RAG
  embedding       vector(1536),    -- OpenAI ada-002
  source_type     TEXT,            -- 'seed' | 'user_upload'
  title           TEXT,
  user_upload_id  UUID REFERENCES profiles(id),
  upload_status   TEXT,
  processing_error TEXT,
  
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
```

### Índices RAG

```sql
-- Búsqueda vectorial
CREATE INDEX idx_corpus_fragments_embedding 
ON corpus_fragments USING ivfflat (embedding vector_cosine_ops);

-- Filtros
CREATE INDEX idx_corpus_fragments_academy ON corpus_fragments(academy_id);
CREATE INDEX idx_corpus_fragments_source_type ON corpus_fragments(source_type);
```

---

## Migraciones Supabase

| Archivo | Descripción |
|---------|-------------|
| `20250712130000_*.sql` | Vitalidad de nodos |
| `20250712150000_*.sql` | Tabla corpus_fragments |
| `20250712170000_*.sql` | Sistema multi-tenant (academies, academy_members) |
| `20250712180000_*.sql` | Soporte RAG (embeddings, pgvector) |

### Aplicar Migraciones

```bash
# Desarrollo local
npx supabase db push

# Producción
npx supabase db push --project-ref <project-ref>
```
