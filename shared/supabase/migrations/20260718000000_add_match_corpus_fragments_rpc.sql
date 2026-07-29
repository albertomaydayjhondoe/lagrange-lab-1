-- ================================================================
-- RPC: match_corpus_fragments - Vector similarity search for RAG
-- Con provenance completa para el flowchart
-- ================================================================

CREATE OR REPLACE FUNCTION public.match_corpus_fragments(
  query_embedding vector(1536),
  match_academy_id uuid DEFAULT NULL,
  match_space_id uuid DEFAULT NULL,  -- Espacio dinámico (flowchart CONFIG)
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  -- Fragmento básico
  id uuid,
  source_file text,
  source_section text,
  axis text[],
  tension float,
  content text,
  keywords text[],
  weight float,
  academy_id uuid,
  space_id uuid,
  source_type text,
  title text,
  -- Provenance fields (flowchart PROVENANCE)
  similarity float,                    -- P3: Similitud semántica (score 0-1)
  ingested_at timestamptz,              -- Timestamp de ingestión
  uploaded_by uuid,                    -- Quién subió el material
  embedding_model text,                -- Modelo de embedding usado
  original_url text,                   -- URL original si vino de web
  page_reference text                  -- Referencia página/minuto
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.source_file,
    cf.source_section,
    cf.axis,
    cf.tension,
    cf.content,
    cf.keywords,
    cf.weight,
    cf.academy_id,
    cf.space_id,                       -- Nuevo: espacio dinámico
    cf.source_type,
    cf.title,
    -- P3: Similitud semántica (score 0-1)
    (1 - (cf.embedding <=> query_embedding))::float as similarity,
    -- P4: Timestamp de ingestión
    cf.ingested_at,
    -- P1: Quién subió
    cf.uploaded_by,
    -- Embedding model usado
    cf.embedding_model,
    -- P2: URL original para provenance
    cf.original_url,
    -- P2: Referencia página/minuto
    cf.page_reference
  FROM public.corpus_fragments cf
  WHERE
    -- Filter by academy or global corpus (NULL academy_id)
    (match_academy_id IS NULL OR cf.academy_id = match_academy_id OR cf.academy_id IS NULL)
    -- Filter by space_id dynamically (flowchart: CONFIG → ASSIGN → espacio dinámico)
    AND (match_space_id IS NULL OR cf.space_id = match_space_id)
    -- Only fragments with embeddings
    AND cf.embedding IS NOT NULL
    -- Only active fragments (status = 'completed' or 'seed')
    AND (cf.upload_status = 'completed' OR cf.upload_status IS NULL OR cf.source_type = 'seed')
    -- Similarity threshold
    AND (1 - (cf.embedding <=> query_embedding)) >= match_threshold
  ORDER BY cf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Drop old signature and recreate with new one
DROP FUNCTION IF EXISTS public.match_corpus_fragments(vector, uuid, int, float);
REVOKE ALL ON FUNCTION public.match_corpus_fragments(vector, uuid, uuid, int, float) FROM public;
GRANT EXECUTE ON FUNCTION public.match_corpus_fragments(vector, uuid, uuid, int, float) TO authenticated, service_role;

-- ================================================================
-- Auto-join policy for PUBLIC academies
-- Any authenticated user can join a public academy with role 'member'
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'join_public_academy'
  ) THEN
    -- Function to auto-join public academies
    CREATE OR REPLACE FUNCTION public.join_public_academy(p_academy_id uuid)
    RETURNS TABLE (
      success boolean,
      message text,
      role text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_is_public boolean;
      v_already_member boolean;
    BEGIN
      -- Check if academy exists and is public
      SELECT a.is_public INTO v_is_public
      FROM public.academies a
      WHERE a.id = p_academy_id;
      
      IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Academia no encontrada', NULL::text;
        RETURN;
      END IF;
      
      IF NOT v_is_public THEN
        RETURN QUERY SELECT false, 'Esta academia es privada. Solicita acceso.', NULL::text;
        RETURN;
      END IF;
      
      -- Check if already a member
      SELECT EXISTS(
        SELECT 1 FROM public.academy_members
        WHERE academy_id = p_academy_id AND user_id = auth.uid()
      ) INTO v_already_member;
      
      IF v_already_member THEN
        RETURN QUERY SELECT true, 'Ya eres miembro de esta academia', 'member';
        RETURN;
      END IF;
      
      -- Insert membership
      INSERT INTO public.academy_members (academy_id, user_id, role)
      VALUES (p_academy_id, auth.uid(), 'member')
      ON CONFLICT (academy_id, user_id) DO NOTHING;
      
      RETURN QUERY SELECT true, 'Te has unido exitosamente a la academia', 'member';
    END;
    $$;
    
    REVOKE ALL ON FUNCTION public.join_public_academy(uuid) FROM public;
    GRANT EXECUTE ON FUNCTION public.join_public_academy(uuid) TO authenticated;
  END IF;
END $$;
