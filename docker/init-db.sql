-- Lagrange Lab - Database Schema
-- PostgreSQL + pgvector

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academies (Multi-tenant)
CREATE TABLE IF NOT EXISTS academies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    owner_user_id UUID NOT NULL REFERENCES users(id),
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#8B5CF6',
    secondary_color VARCHAR(7) DEFAULT '#A78BFA',
    background_color VARCHAR(7) DEFAULT '#0F0F23',
    text_color VARCHAR(7) DEFAULT '#E2E8F0',
    axes_config JSONB DEFAULT '{"miedo": true, "control": true, "salud": true, "legitimidad": true, "responsabilidad": true}',
    oracle_persona_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'tutor', 'platon')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(academy_id, user_id)
);

-- Spaces (Materias/Temas)
CREATE TABLE IF NOT EXISTS academy_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG - Corpus with Vector Search
CREATE TABLE IF NOT EXISTS corpus_fragments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_file VARCHAR(500) NOT NULL,
    source_section VARCHAR(100),
    axis TEXT[] DEFAULT '{}',
    tension DECIMAL(3,2) DEFAULT 0.7,
    content TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    weight DECIMAL(3,2) DEFAULT 1.0,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    space_id UUID REFERENCES academy_spaces(id) ON DELETE SET NULL,
    embedding VECTOR(1536),
    source_type VARCHAR(50),
    title VARCHAR(500),
    similarity DECIMAL(3,2),
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    embedding_model VARCHAR(50),
    original_url TEXT,
    page_reference VARCHAR(200),
    upload_status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_corpus_embedding ON corpus_fragments USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_corpus_academy ON corpus_fragments(academy_id);

-- Socratic Questions
CREATE TABLE IF NOT EXISTS socratic_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    eje VARCHAR(50) NOT NULL,
    nivel INTEGER CHECK (nivel BETWEEN 1 AND 3),
    tension DECIMAL(3,2) DEFAULT 0.5,
    texto TEXT NOT NULL,
    corpus_ref VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topology (Knowledge Map)
CREATE TABLE IF NOT EXISTS topology_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    x DECIMAL(10,2) DEFAULT 0,
    y DECIMAL(10,2) DEFAULT 0,
    weight DECIMAL(3,2) DEFAULT 1.0,
    color VARCHAR(7) DEFAULT '#8B5CF6',
    axis VARCHAR(50),
    type VARCHAR(50) DEFAULT 'concept',
    corpus_refs TEXT[],
    question_count INTEGER DEFAULT 0,
    vitality DECIMAL(3,2) DEFAULT 0.5,
    last_explored_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topology_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    source UUID NOT NULL REFERENCES topology_nodes(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES topology_nodes(id) ON DELETE CASCADE,
    tension DECIMAL(3,2) DEFAULT 0.5,
    label VARCHAR(200),
    type VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutoring
CREATE TABLE IF NOT EXISTS tutoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled',
    meeting_url TEXT,
    max_students INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'confirmed',
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS tutoring_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
    subject_id UUID,
    student_id UUID REFERENCES users(id),
    question TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    materials_used JSONB DEFAULT '[]',
    rag_context_used BOOLEAN DEFAULT false,
    token_usage INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Podcast
CREATE TABLE IF NOT EXISTS podcast_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    audio_url TEXT,
    duration_seconds INTEGER,
    question_ids UUID[],
    eje VARCHAR(50),
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Dialogues
CREATE TABLE IF NOT EXISTS saved_dialogues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access Requests
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_role VARCHAR(20) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

-- Genesis Academy (default)
INSERT INTO academies (id, name, slug, description, is_public, owner_user_id, primary_color)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Genesis',
    'genesis',
    'Academia default del sistema Lagrange Lab',
    true,
    '00000000-0000-0000-0000-000000000000',
    '#8B5CF6'
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully';
END $$;
