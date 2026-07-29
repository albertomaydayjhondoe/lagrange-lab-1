# 📋 PROYECTO: De PaaS Multi-Tenant a SaaS Horizontal por Estudiante

> **Versión:** 1.0  
> **Fecha:** 2026-07-29  
> **Estado:** PENDIENTE DE APROBACIÓN  
> **Tipo:** Transformación de Arquitectura

---

## 1. RESUMEN EJECUTIVO

### 🎯 Intención del Usuario

Transformar **Lagrange Lab** de una **PaaS multi-tenant centralizada** (donde academias/universidades comparten un motor de IA) en un **SaaS horizontal estanco por estudiante** (donde cada estudiante tiene su espacio aislado con motor privado y materiales propios).

### 📌 Objetivos Clave

1. **Estancos por estudiante**: Cada estudiante tiene su entorno 100% aislado
2. **Asignaturas personales**: Cada estudiante puede crear/matricularse en asignaturas
3. **Materiales multi-formato**: Upload de PDFs, DOCs, Videos, Audio, URLs en cualquier formato
4. **Motor IA privado**: Cada estudiante tiene su propio contexto RAG
5. **Arquitectura horizontal**: Escalabilidad lineal por estudiante

---

## 2. ANÁLISIS COMPARATIVO: PaaS vs SaaS Horizontal

### 2.1 Definiciones

| Concepto | PaaS (Modelo Actual) | SaaS Horizontal (Modelo Nuevo) |
|----------|---------------------|-------------------------------|
| **Definición** | Platform as a Service multi-tenant | Software as a Service por usuario |
| **Unidad de "alquiler"** | Academia/Universidad | Estudiante individual |
| **Compartición** | Motor compartido por todas las academias | Motor privado por estudiante |
| **Aislamiento** | Por `academy_id` (comparte recursos) | Por `student_id` (estanco hermético) |
| **Modelo de datos** | Multi-tenant centralizado | Multi-tenant por usuario |
| **Escalabilidad** | Vertical (más academias) | Horizontal (más estudiantes) |
| **Costo** | Compartido entre tenants | Por estudiante |

### 2.2 Arquitectura Actual vs Nueva

#### Modelo PaaS Actual (Multi-Tenant)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LAGRANGE LAB - PAAS                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    ⚙️ MOTOR ÚNICO                           │    │
│  │                         (1 oráculo para TODOS)               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                 │                                    │
│         ┌──────────────────────┼──────────────────────┐             │
│         ▼                      ▼                      ▼              │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐     │
│  │  Academia   │        │  Academia    │        │  Academia    │     │
│  │  Sócrates   │        │   Newton     │        │    Curie     │     │
│  │  ─────────  │        │  ─────────   │        │  ─────────   │     │
│  │  Members    │        │  Members     │        │  Members     │     │
│  │  Materials  │        │  Materials   │        │  Materials   │     │
│  └─────────────┘        └─────────────┘        └─────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Modelo SaaS Horizontal (Por Estudiante)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LAGRANGE LAB - SAAS HORIZONTAL                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              🧑‍🎓 ESTUDIANTE: Juan Pérez                        │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  📚 Asignatura: Matemáticas                          │    │   │
│  │  │  ├── 📄 Material: algebra.pdf                        │    │   │
│  │  │  ├── 📄 Material: calculo.pdf                        │    │   │
│  │  │  └── 🔗 Material: Khan Academy (URL)                │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  📚 Asignatura: Historia                            │    │   │
│  │  │  ├── 🎥 Material: Video clase 1.mp4                │    │   │
│  │  │  └── 🎧 Material: Audio podcast.wav                 │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  ⚙️ MOTOR IA PRIVADO                                │    │   │
│  │  │     (Contexto RAG de TODOS sus materiales)          │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              🧑‍🎓 ESTUDIANTE: María García                       │   │
│  │  (ESTANCO COMPLETAMENTE AISLADO DE JUAN PÉREZ)             │   │
│  │  ...                                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Comparación Detallada

| Dimensión | PaaS Actual | SaaS Horizontal | Impacto |
|-----------|-------------|-----------------|---------|
| **Motor IA** | Compartido (1 socratic-oracle) | Privado por estudiante | Mayor personalización |
| **Materiales** | Corpus por academy | Materials por estudiante/asignatura | Mayor granularidad |
| **Asignaturas** | Materias predefinidas por academia | Asignaturas creadas por estudiante | Mayor autonomía |
| **Aislamiento** | Members comparten academia | Cada estudiante es isolated tenant | Mayor privacidad |
| **Escalabilidad** | +10 academias = mismo motor | +10 estudiantes = +10 contextos | Modelo horizontal |
| **Costo** | Compartido | Por usuario | Diferentes modelos de negocio |
| **Onboarding** | Unirse a academia existente | Crear espacio personal | Experiencia diferente |

### 2.4 Diferencias en el Flujo de Usuario

#### PaaS Actual: Unirse a Academia → Preguntar al Oráculo

```
1. Estudiante → Unirse a "Sócrates" (academia)
2. Estudiante → Pregunta: "¿Qué es el ser?"
3. socratic-oracle → Busca en corpus_Sócrates
4. Respuesta → Con fuentes de Sócrates
```

#### SaaS Horizontal: Crear Espacio → Subir Materiales → Preguntar

```
1. Estudiante → Crea cuenta → Espacio personal creado
2. Estudiante → Crea asignatura "Filosofía"
3. Estudiante → Sube PDF de Platón + Video de Aristóteles
4. Estudiante → Pregunta: "¿Qué es el ser?"
5. student-oracle → Busca en TODOS los materiales de ESTE estudiante
6. Respuesta → Con fuentes de SUS materiales personales
```

---

## 3. DISEÑO DE ARQUITECTURA NUEVA

### 3.1 Modelo de Datos

```sql
-- ================================================================
-- NUEVO ESQUEMA: student_subjects (SaaS Horizontal)
-- ================================================================

-- 1. STUDENTS TABLE (Cada estudiante es un tenant)
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Perfil del estudiante
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  -- Configuración personal
  learning_goals JSONB DEFAULT '[]',
  preferred_ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_temperature NUMERIC DEFAULT 0.7,
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  -- Settings
  settings JSONB DEFAULT '{}'
);

-- 2. SUBJECTS TABLE (Asignaturas del estudiante)
CREATE TABLE public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  -- Datos de la asignatura
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#6366f1',
  -- AI Configuration para esta asignatura
  ai_system_prompt TEXT,
  ai_model_override TEXT,
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  -- Orden
  order_index INT DEFAULT 0,
  -- Constraints
  UNIQUE (student_id, slug)
);

-- 3. MATERIALS TABLE (Materiales por asignatura)
CREATE TABLE public.student_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE,
  -- Metadatos del material
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'pdf', 'docx', 'doc', 'txt', 'md', 
    'url', 'video', 'audio', 'image', 
    'csv', 'xlsx', 'pptx', 'youtube', 
    'webpage', 'notion', 'google_doc'
  )),
  mime_type TEXT,
  -- Contenido/Referencia
  content TEXT,              -- Para texto, URLs, etc.
  file_url TEXT,             -- Para archivos subidos
  external_id TEXT,          -- ID externo (YouTube, etc.)
  metadata JSONB DEFAULT '{}', -- Metadatos adicionales
  -- Procesamiento RAG
  processing_status TEXT DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  chunks_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  -- Embeddings
  has_embeddings BOOLEAN DEFAULT FALSE,
  embedding_model TEXT,
  embedding_dimension INT,
  -- Timestamps
  ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 4. MATERIAL CHUNKS TABLE (Chunks para RAG)
CREATE TABLE public.student_material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.student_materials(id) ON DELETE CASCADE,
  -- Chunk data
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- Supabase pgvector
  -- Metadatos del chunk
  page_number INT,
  section_title TEXT,
  word_count INT,
  token_count INT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STUDENT DIALOGUES TABLE (Historial de diálogos)
CREATE TABLE public.student_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
  -- Datos del diálogo
  title TEXT,
  messages JSONB DEFAULT '[]',
  sources_used JSONB DEFAULT '[]',
  -- Métricas
  total_messages INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_sources INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  model_used TEXT,
  -- Estado
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STUDY SESSIONS TABLE (Sesiones de estudio)
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
  -- Datos de la sesión
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  -- Interacciones
  questions_asked INT DEFAULT 0,
  materials_viewed JSONB DEFAULT '[]',
  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled'))
);
```

### 3.2 Diagrama de Relaciones

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│  auth.users  │──────<│    students      │──────<│  student_subjects │
│              │       │                  │       │                   │
│  (Supabase   │       │  • display_name  │       │  • name           │
│   Auth)      │       │  • ai_settings   │       │  • ai_system_prompt│
└──────────────┘       │  • settings      │       │  • is_active      │
                       └──────────────────┘       └───────────────────┘
                              │                            │
                              │                            │
                              │                            ▼
                              │                   ┌───────────────────┐
                              │                   │ student_materials │
                              │                   │                   │
                              │                   │  • source_type    │
                              │                   │  • content/file_url│
                              │                   │  • processing_status│
                              │                   │  • chunks_count    │
                              │                   └───────────────────┘
                              │                            │
                              │                            ▼
                              │                   ┌───────────────────┐
                              │                   │student_material   │
                              │                   │_chunks            │
                              │                   │                   │
                              │                   │  • chunk_index    │
                              │                   │  • content        │
                              │                   │  • embedding      │
                              │                   └───────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ student_dialogues │
                       │                  │
                       │  • messages      │
                       │  • sources_used  │
                       │  • metrics       │
                       └──────────────────┘
```

### 3.3 Edge Functions para SaaS

```typescript
// student-oracle: Motor IA privado por estudiante
// GET /functions/v1/student-oracle
interface StudentOracleRequest {
  studentId: string;
  subjectId?: string;        // Opcional: filtrar por asignatura
  question: string;
  conversationHistory?: Message[];
  includeSources?: boolean;
}

// ingest-material: Upload multi-formato
// POST /functions/v1/ingest-material
interface IngestMaterialRequest {
  studentId: string;
  subjectId: string;
  title: string;
  sourceType: 'pdf' | 'url' | 'video' | 'audio' | 'docx' | ...;
  content?: string;          // Para texto/URLs
  fileData?: string;         // Base64 para archivos
  fileUrl?: string;          // URL externa
}

// manage-subject: CRUD de asignaturas
// GET/POST/PUT/DELETE /functions/v1/manage-subject
interface SubjectRequest {
  studentId: string;
  name: string;
  description?: string;
  aiSystemPrompt?: string;
}
```

### 3.4 Políticas RLS (Estanco Hermético)

```sql
-- STUDENTS: Solo el propio estudiante puede ver sus datos
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_own_data"
  ON public.students FOR ALL
  USING (user_id = auth.uid());

-- STUDENT_SUBJECTS: Solo el dueño puede ver/modificar
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_subjects_own"
  ON public.student_subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_subjects.student_id 
      AND students.user_id = auth.uid()
    )
  );

-- STUDENT_MATERIALS: Estanco total
ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_materials_own"
  ON public.student_materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.student_subjects ss
      JOIN public.students s ON ss.student_id = s.id
      WHERE ss.id = student_materials.subject_id
      AND s.user_id = auth.uid()
    )
  );

-- STUDENT_MATERIAL_CHUNKS: Solo vía JOIN con materials
ALTER TABLE public.student_material_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_chunks_own"
  ON public.student_material_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_materials sm
      JOIN public.student_subjects ss ON sm.subject_id = ss.id
      JOIN public.students s ON ss.student_id = s.id
      WHERE sm.id = student_material_chunks.material_id
      AND s.user_id = auth.uid()
    )
  );
```

---

## 4. RUTA DE MIGRACIÓN (Backward Compatibility)

### 4.1 Estrategia de Migración

Para no romper el sistema existente, se propone:

1. **Modo Dual**: Mantener both PaaS (academies) y SaaS (students)
2. **Migración gradual**: Usuarios pueden migrar cuando lo deseen
3. **Importación de datos**: Un owner puede importar su academy como student's subjects

### 4.2 Mapa de Correspondencias

| PaaS (Actual) | SaaS (Nuevo) | Notas |
|--------------|--------------|-------|
| `academies` | `students` | Cada estudiante = tenant |
| `academies.members` | `student_subjects` | Asignaturas del estudiante |
| `corpus_fragments` | `student_materials` | Materiales por asignatura |
| `topology_nodes` | (eliminado) | No aplica en modelo personal |
| `socratic_oracle` | `student_oracle` | Motor privado por estudiante |
| `academy_id` | `student_id` | Nueva clave de aislamiento |

### 4.3 Opciones de Implementación

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A** | Nuevo schema completo, sin migrar | Rápido, limpio | Pierde datos existentes |
| **B** | Schema dual (PaaS + SaaS coexistiendo) | Compatibilidad, gradual | Mayor complejidad |
| **C** | Migración de academies → students | Conserva todo, transformación completa | Riesgo de migración |

---

## 5. PREGUNTAS DE CLARIFICACIÓN

Antes de proceder, necesito tu confirmación en:

### 5.1 Sobre las Academias Existentes

- [ ] **¿Las academias existentes (Sócrates, Newton, Curie) se migran a estudiantes?**
  - Opción A: Cada academia = un estudiante (el owner)
  - Opción B: Las academias desaparecen, usuarios crean espacios propios
  - Opción C: Mantener academias como "instituciones" que contienen estudiantes

### 5.2 Sobre el Motor de IA

- [ ] **¿Cada estudiante tiene un motor IA completamente privado?**
  - Sí: Contextos completamente separados
  - No: Compartir motor pero con RLS por estudiante

### 5.3 Sobre los Materiales Existentes

- [ ] **¿Los corpus_fragments existentes se migran a student_materials?**
  - Sí: Importación automática para members
  - No: Se начинают de cero

### 5.4 Sobre el Nombre del Producto

- [ ] **¿Cómo se llamará el producto en modo SaaS?**
  - Lagrange Lab (mismo nombre)
  - Lagrange Personal
  - Otro: ___________

### 5.5 Sobre Pricing/Modelo de Negocio

- [ ] **¿Se implementa sistema de planes/limites?**
  - Sí: Free/Pro/Enterprise por estudiante
  - No: Solo límites de usage

---

## 6. ALCANCE PROPUESTO (Para Aprobación)

### Fase 1: Foundation (Semana 1-2)
- [ ] Nuevo schema `students`, `student_subjects`, `student_materials`
- [ ] Edge Function `student-oracle` con aislamiento
- [ ] Edge Function `ingest-material` multi-formato
- [ ] RLS policies para estanco hermético

### Fase 2: Core Features (Semana 3-4)
- [ ] CRUD de asignaturas para estudiantes
- [ ] Upload de materiales (PDF, URL, video)
- [ ] Chat con IA socrática sobre materiales personales
- [ ] Historial de diálogos por estudiante

### Fase 3: Polish (Semana 5-6)
- [ ] Dashboard del estudiante
- [ ] Métricas de aprendizaje
- [ ] Importación desde academias existentes
- [ ] UI/UX del nuevo modelo

### Fase 4: Launch (Semana 7-8)
- [ ] Onboarding flow para nuevos estudiantes
- [ ] Migración opcional de usuarios existentes
- [ ] Documentación
- [ ] Deploy a producción

---

## 7. NO REALIZAR NINGÚN CAMBIO HASTA:

1. ✅ Este documento sea revisado y aprobado
2. ✅ Las preguntas de clarificación sean respondidas
3. ✅ El alcance de la Fase 1 esté confirmado
4. ✅ La estrategia de migración esté definida

---

**¿Confirmas que proceda con la implementación de este proyecto según el alcance descrito?**

Responde con:
- **"APROBADO"** para proceder con Fase 1
- **"APROBADO CON CAMBIOS"** + descripción de cambios
- **"RECHAZADO"** + razones
