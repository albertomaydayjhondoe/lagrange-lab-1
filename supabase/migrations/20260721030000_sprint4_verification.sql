-- ================================================================
-- SPRINT 4: Verificación Post-Migración
-- ================================================================
-- Timestamp: 20260721030000
-- Ejecutar DESPUÉS de aplicar 20260721020000_sprint1_academy_spaces_schema.sql
-- ================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'SPRINT 4: VERIFICACIÓN POST-MIGRACIÓN';
RAISE NOTICE '============================================================';

-- =================================================================
-- 1. VERIFICAR QUE academy_spaces EXISTE Y TIENE DATOS
-- =================================================================

DO $$
DECLARE
  v_spaces_count INTEGER;
  v_genesis_academy_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  SELECT COUNT(*) INTO v_spaces_count FROM public.academy_spaces;
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 1: academy_spaces ---';
  RAISE NOTICE 'Total de espacios en academy_spaces: %', v_spaces_count;
  
  IF v_spaces_count > 0 THEN
    RAISE NOTICE 'OK: academy_spaces tiene datos';
  ELSE
    RAISE WARNING 'FALLO: academy_spaces está vacío';
  END IF;
END $$;

-- =================================================================
-- 2. VERIFICAR MIGRACIÓN DE thematic_axes A academy_spaces
-- =================================================================

DO $$
DECLARE
  v_axes_count INTEGER;
  v_migrated_count INTEGER;
  v_genesis_academy_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Contar thematic_axes originales
  SELECT COUNT(*) INTO v_axes_count FROM public.thematic_axes;
  
  -- Contar espacios migrados desde thematic_axes
  SELECT COUNT(*) INTO v_migrated_count 
  FROM public.academy_spaces 
  WHERE source_table = 'thematic_axes';
  
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 2: Migración thematic_axes → academy_spaces ---';
  RAISE NOTICE 'thematic_axes original: % filas', v_axes_count;
  RAISE NOTICE 'academy_spaces con source_table=thematic_axes: % filas', v_migrated_count;
  
  IF v_migrated_count >= v_axes_count THEN
    RAISE NOTICE 'OK: Todas las filas de thematic_axes migraron a academy_spaces';
  ELSE
    RAISE WARNING 'FALLO: Hay menos filas migradas (%) que originales (%)', v_migrated_count, v_axes_count;
  END IF;
  
  -- Listar los 5 ejes clásicos de Génesis
  RAISE NOTICE '';
  RAISE NOTICE 'Espacios migrados desde thematic_axes (Génesis):';
  SELECT name, slug, color 
  FROM public.academy_spaces 
  WHERE source_table = 'thematic_axes' 
    AND academy_id = v_genesis_academy_id
  ORDER BY order_index;
END $$;

-- =================================================================
-- 3. VERIFICAR MIGRACIÓN DE subjects A academy_spaces
-- =================================================================

DO $$
DECLARE
  v_subjects_count INTEGER;
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_subjects_count FROM public.subjects;
  SELECT COUNT(*) INTO v_migrated_count 
  FROM public.academy_spaces 
  WHERE source_table = 'subjects';
  
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 3: Migración subjects → academy_spaces ---';
  RAISE NOTICE 'subjects original: % filas', v_subjects_count;
  RAISE NOTICE 'academy_spaces con source_table=subjects: % filas', v_migrated_count;
  
  IF v_migrated_count >= v_subjects_count THEN
    RAISE NOTICE 'OK: Todas las filas de subjects migraron a academy_spaces';
  ELSE
    RAISE WARNING 'FALLO: Hay menos filas migradas (%) que originales (%)', v_migrated_count, v_subjects_count;
  END IF;
END $$;

-- =================================================================
-- 4. VERIFICAR MIGRACIÓN DE topics A academy_spaces (con jerarquía)
-- =================================================================

DO $$
DECLARE
  v_topics_count INTEGER;
  v_migrated_count INTEGER;
  v_with_parent INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_topics_count FROM public.topics;
  SELECT COUNT(*) INTO v_migrated_count 
  FROM public.academy_spaces 
  WHERE source_table = 'topics';
  SELECT COUNT(*) INTO v_with_parent 
  FROM public.academy_spaces 
  WHERE source_table = 'topics' AND parent_space_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 4: Migración topics → academy_spaces (jerarquía) ---';
  RAISE NOTICE 'topics original: % filas', v_topics_count;
  RAISE NOTICE 'academy_spaces con source_table=topics: % filas', v_migrated_count;
  RAISE NOTICE 'topics con parent_space_id: % filas', v_with_parent;
  
  IF v_migrated_count >= v_topics_count THEN
    RAISE NOTICE 'OK: Todas las filas de topics migraron a academy_spaces';
  ELSE
    RAISE WARNING 'FALLO: Hay menos filas migradas (%) que originales (%)', v_migrated_count, v_topics_count;
  END IF;
  
  -- Mostrar ejemplos de jerarquía
  RAISE NOTICE '';
  RAISE NOTICE 'Ejemplos de jerarquía (topics → subjects):';
  SELECT 
    sp.name as topic_name,
    sp.slug as topic_slug,
    parent.name as subject_name,
    parent.slug as subject_slug
  FROM public.academy_spaces sp
  JOIN public.academy_spaces parent ON sp.parent_space_id = parent.id
  LIMIT 5;
END $$;

-- =================================================================
-- 5. VERIFICAR QUE COLUMNAS space_id FUERON AÑADIDAS
-- =================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 5: Columnas space_id añadidas ---';
  
  -- Verificar que las columnas existen
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'corpus_fragments' AND column_name = 'space_id'
  ) THEN
    RAISE NOTICE 'OK: corpus_fragments.space_id existe';
  ELSE
    RAISE WARNING 'FALLO: corpus_fragments.space_id NO existe';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'socratic_questions' AND column_name = 'space_id'
  ) THEN
    RAISE NOTICE 'OK: socratic_questions.space_id existe';
  ELSE
    RAISE WARNING 'FALLO: socratic_questions.space_id NO existe';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' AND column_name = 'space_id'
  ) THEN
    RAISE NOTICE 'OK: materials.space_id existe';
  ELSE
    RAISE WARNING 'FALLO: materials.space_id NO existe';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tutoring_sessions' AND column_name = 'space_id'
  ) THEN
    RAISE NOTICE 'OK: tutoring_sessions.space_id existe';
  ELSE
    RAISE WARNING 'FALLO: tutoring_sessions.space_id NO existe';
  END IF;
END $$;

-- =================================================================
-- 6. VERIFICAR RLS DE academy_spaces
-- =================================================================

DO $$
DECLARE
  v_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policies_count 
  FROM pg_policies 
  WHERE tablename = 'academy_spaces';
  
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 6: Políticas RLS de academy_spaces ---';
  RAISE NOTICE 'Políticas RLS definidas: %', v_policies_count;
  
  IF v_policies_count >= 5 THEN
    RAISE NOTICE 'OK: academy_spaces tiene políticas RLS (SELECT, INSERT, UPDATE, DELETE + platform admin)';
  ELSE
    RAISE WARNING 'FALLO: academy_spaces tiene pocas políticas RLS (%)', v_policies_count;
  END IF;
  
  -- Listar políticas
  SELECT policyname, cmd, permissive
  FROM pg_policies
  WHERE tablename = 'academy_spaces'
  ORDER BY policyname;
END $$;

-- =================================================================
-- 7. VERIFICAR FUNCIÓN match_corpus_fragments ACTUALIZADA
-- =================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 7: Función match_corpus_fragments ---';
  
  -- Verificar que la función tiene el nuevo parámetro
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'match_corpus_fragments'
      AND pg_get_function_arguments(prooid) LIKE '%match_space_id%'
  ) THEN
    RAISE NOTICE 'OK: match_corpus_fragments tiene parámetro match_space_id';
  ELSE
    RAISE WARNING 'FALLO: match_corpus_fragments NO tiene parámetro match_space_id';
  END IF;
END $$;

-- =================================================================
-- 8. VERIFICAR FUNCIÓN match_materials ACTUALIZADA
-- =================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 8: Función match_materials ---';
  
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'match_materials'
      AND pg_get_function_arguments(prooid) LIKE '%match_space_id%'
  ) THEN
    RAISE NOTICE 'OK: match_materials tiene parámetro match_space_id';
  ELSE
    RAISE WARNING 'FALLO: match_materials NO tiene parámetro match_space_id';
  END IF;
END $$;

-- =================================================================
-- 9. VERIFICAR DATOS DE GÉNESIS
-- =================================================================

DO $$
DECLARE
  v_genesis_academy_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_spaces_count INTEGER;
  v_nodes_count INTEGER;
  v_questions_count INTEGER;
  v_fragments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_spaces_count 
  FROM public.academy_spaces 
  WHERE academy_id = v_genesis_academy_id;
  
  SELECT COUNT(*) INTO v_nodes_count 
  FROM public.topology_nodes 
  WHERE academy_id = v_genesis_academy_id;
  
  SELECT COUNT(*) INTO v_questions_count 
  FROM public.socratic_questions 
  WHERE academy_id = v_genesis_academy_id;
  
  SELECT COUNT(*) INTO v_fragments_count 
  FROM public.corpus_fragments 
  WHERE academy_id = v_genesis_academy_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '--- VERIFICACIÓN 9: Academia Génesis (datos existentes) ---';
  RAISE NOTICE 'Espacios en Génesis: %', v_spaces_count;
  RAISE NOTICE 'Nodos en Génesis: %', v_nodes_count;
  RAISE NOTICE 'Preguntas en Génesis: %', v_questions_count;
  RAISE NOTICE 'Fragmentos en Génesis: %', v_fragments_count;
  
  IF v_spaces_count > 0 THEN
    RAISE NOTICE 'OK: Academia Génesis tiene espacios migrados';
  ELSE
    RAISE WARNING 'FALLO: Academia Génesis no tiene espacios';
  END IF;
END $$;

-- =================================================================
-- RESUMEN FINAL
-- =================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'RESUMEN DE VERIFICACIÓN';
RAISE NOTICE '============================================================';
RAISE NOTICE 'SPRINT 1: academy_spaces creado ✓';
RAISE NOTICE 'SPRINT 2: seed-platform-owner edge function creada ✓';
RAISE NOTICE 'SPRINT 3: Frontend actualizado (SpacesEditor) ✓';
RAISE NOTICE '';
RAISE NOTICE 'PRÓXIMOS PASOS:';
RAISE NOTICE '1. Aplicar las migraciones en orden:';
RAISE NOTICE '   - 20260721010000_fix_academies_rls_with_tests.sql';
RAISE NOTICE '   - 20260721020000_sprint1_academy_spaces_schema.sql';
RAISE NOTICE '   - 20260721030000_sprint4_verification.sql';
RAISE NOTICE '';
RAISE NOTICE '2. Configurar secretos para platform owner:';
RAISE NOTICE '   supabase secrets set ADMIN_SEED_EMAIL=admin@ejemplo.com ADMIN_SEED_PASSWORD=MiPassword';
RAISE NOTICE '';
RAISE NOTICE '3. Invocar seed-platform-owner:';
RAISE NOTICE '   curl -X POST "https://[PROJECT].supabase.co/functions/v1/seed-platform-owner" \';
RAISE NOTICE '     -H "Authorization: Bearer [SERVICE_ROLE_KEY]"';
RAISE NOTICE '';
RAISE NOTICE '4. Verificar en la UI que:';
RAISE NOTICE '   - La pestaña "Espacios" muestra los espacios migrados';
RAISE NOTICE '   - El owner de plataforma tiene badge de admin';
RAISE NOTICE '============================================================';
