-- ================================================================
-- UPDATE: corpus_fragments - Agregar campos para RAG multi-formato
-- con procedencia completa según flowchart
-- ================================================================
-- Timestamp: 20260722000003
-- Flowchart steps: CHUNK → EMBED → STORE
-- 
-- Campos agregados:
--   - space_id: UUID - espacio dinámico dentro de academia
--   - uploaded_by: UUID - usuario que subió el material
--   - ingested_at: TIMESTAMPTZ - timestamp de ingestión
--   - embedding_model: TEXT - modelo de embedding usado
--   - original_url: TEXT - URL original si vino de web
--   - page_reference: TEXT - referencia de página/minuto para provenance
-- ================================================================

-- 1. Agregar space_id para espacios dinámicos
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.corpus_fragments.space_id IS 'Espacio dinámico dentro de la academia (nuevo, sin lista fija de ejes)';

-- 2. Agregar uploaded_by para trazabilidad
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.corpus_fragments.uploaded_by IS 'Usuario que subió el material original';

-- 3. Agregar ingested_at para timestamp
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.corpus_fragments.ingested_at IS 'Timestamp de cuando se ingestó el fragmento';

-- 4. Agregar embedding_model para saber qué modelo generó el embedding
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

COMMENT ON COLUMN public.corpus_fragments.embedding_model IS 'Modelo de embedding usado (AI_EMBEDDING_MODEL)';

-- 5. Agregar original_url para provenance de fuentes web
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS original_url TEXT;

COMMENT ON COLUMN public.corpus_fragments.original_url IS 'URL original si el material vino de la web';

-- 6. Agregar page_reference para provenance (PDF página, minuto de video, etc)
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS page_reference TEXT;

COMMENT ON COLUMN public.corpus_fragments.page_reference IS 'Referencia de ubicación: página X, minuto Y, etc. para provenance';

-- 7. Asegurar que source_type cubra todos los formatos del flowchart
-- Valores válidos: pdf, docx, txt, md, audio, video, url, imagen, csv, user_upload, seed
DO $$
BEGIN
  -- Agregar constraint si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'corpus_fragments_source_type_check'
  ) THEN
    ALTER TABLE public.corpus_fragments 
    ADD CONSTRAINT corpus_fragments_source_type_check 
    CHECK (source_type IN ('pdf', 'docx', 'txt', 'md', 'audio', 'video', 'url', 'imagen', 'csv', 'user_upload', 'seed'));
  END IF;
END $$;

-- 8. Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_space ON public.corpus_fragments(space_id);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_uploaded_by ON public.corpus_fragments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_ingested_at ON public.corpus_fragments(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_source_type ON public.corpus_fragments(source_type);

-- 9. Índice compuesto para queries RAG por academy + space
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_academy_space 
ON public.corpus_fragments(academy_id, space_id) 
WHERE embedding IS NOT NULL;

-- 10. Actualizar RLS policies para incluir nuevos campos
-- SELECT: ya existente, permite lectura a miembros de academia
-- Para service role: acceso total
DROP POLICY IF EXISTS "Service role can manage corpus fragments" ON public.corpus_fragments;
CREATE POLICY "Service role can manage corpus fragments"
ON public.corpus_fragments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 11. Migrar datos existentes: populate uploaded_by y ingested_at
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Contar registros sin uploaded_by
  SELECT COUNT(*) INTO v_count 
  FROM public.corpus_fragments 
  WHERE uploaded_by IS NULL AND user_upload_id IS NOT NULL;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Migrando % registros: user_upload_id → uploaded_by', v_count;
    
    UPDATE public.corpus_fragments 
    SET uploaded_by = user_upload_id::UUID
    WHERE uploaded_by IS NULL AND user_upload_id IS NOT NULL;
  END IF;
  
  -- Contar registros sin ingested_at
  SELECT COUNT(*) INTO v_count 
  FROM public.corpus_fragments 
  WHERE ingested_at IS NULL;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Migrando % registros: created_at → ingested_at', v_count;
    
    UPDATE public.corpus_fragments 
    SET ingested_at = created_at
    WHERE ingested_at IS NULL;
  END IF;
  
  -- Contar registros sin embedding_model
  SELECT COUNT(*) INTO v_count 
  FROM public.corpus_fragments 
  WHERE embedding_model IS NULL;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Migrando % registros: estableciendo embedding_model por defecto', v_count;
    
    UPDATE public.corpus_fragments 
    SET embedding_model = 'text-embedding-3-small'
    WHERE embedding_model IS NULL;
  END IF;
END $$;

-- 12. Verificaciones post-migración
RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'VERIFICACIONES: corpus_fragments actualizado';
RAISE NOTICE '============================================================';

DO $$
DECLARE
  v_total INTEGER;
  v_with_space INTEGER;
  v_with_uploaded_by INTEGER;
  v_with_ingested_at INTEGER;
  v_with_embedding_model INTEGER;
  v_with_original_url INTEGER;
  v_with_page_ref INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.corpus_fragments;
  SELECT COUNT(*) INTO v_with_space FROM public.corpus_fragments WHERE space_id IS NOT NULL;
  SELECT COUNT(*) INTO v_with_uploaded_by FROM public.corpus_fragments WHERE uploaded_by IS NOT NULL;
  SELECT COUNT(*) INTO v_with_ingested_at FROM public.corpus_fragments WHERE ingested_at IS NOT NULL;
  SELECT COUNT(*) INTO v_with_embedding_model FROM public.corpus_fragments WHERE embedding_model IS NOT NULL;
  SELECT COUNT(*) INTO v_with_original_url FROM public.corpus_fragments WHERE original_url IS NOT NULL;
  SELECT COUNT(*) INTO v_with_page_ref FROM public.corpus_fragments WHERE page_reference IS NOT NULL;
  
  RAISE NOTICE 'Total registros: %', v_total;
  RAISE NOTICE 'Con space_id: %', v_with_space;
  RAISE NOTICE 'Con uploaded_by: %', v_with_uploaded_by;
  RAISE NOTICE 'Con ingested_at: %', v_with_ingested_at;
  RAISE NOTICE 'Con embedding_model: %', v_with_embedding_model;
  RAISE NOTICE 'Con original_url: %', v_with_original_url;
  RAISE NOTICE 'Con page_reference: %', v_with_page_ref;
  
  -- Mostrar distribución por source_type
  RAISE NOTICE '';
  RAISE NOTICE 'Distribución por source_type:';
  SELECT source_type, COUNT(*) as count 
  FROM public.corpus_fragments 
  GROUP BY source_type 
  ORDER BY count DESC;
END $$;

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'SCHEMA UPDATE COMPLETADO: campos RAG/provenance agregados';
RAISE NOTICE '============================================================';
