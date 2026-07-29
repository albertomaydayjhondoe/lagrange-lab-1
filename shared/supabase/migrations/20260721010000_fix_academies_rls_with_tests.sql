-- ================================================================
-- FIX RLS: Restaurar seguridad de academies y academy_members
-- después de la migración temporal 20260718010000
-- ================================================================
-- Timestamp: 20260721010000
-- 
-- PROBLEMA RESUELTO:
--   20260718010000 abrió las políticas con USING (true) y 
--   WITH CHECK (true) para evitar recursión RLS.
--
-- SOLUCIÓN:
--   Usar la función is_member_of_academy() creada en la misma
--   migración pero nunca aplicada a las políticas.
-- ================================================================

-- =================================================================
-- 0. CREAR FUNCIÓN is_member_of_academy SI NO EXISTE
-- =================================================================
CREATE OR REPLACE FUNCTION public.is_member_of_academy(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.academy_members
    WHERE academy_id = p_academy_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of_academy(UUID) TO authenticated, anon, service_role;

-- =================================================================
-- 1. ACADEMIES SELECT: Corregir USING (true) → lógica correcta
-- =================================================================
DROP POLICY IF EXISTS "Anyone can view academies" ON public.academies;
DROP POLICY IF EXISTS "Academies are viewable by members and owners" ON public.academies;

CREATE POLICY "Academies are viewable by members and owners"
ON public.academies
FOR SELECT
USING (
  is_public = true 
  OR owner_user_id = auth.uid() 
  OR is_member_of_academy(id)
);

-- =================================================================
-- 2. ACADEMIES INSERT: Corregir WITH CHECK (true) → solo owner
-- =================================================================
DROP POLICY IF EXISTS "Authenticated users can create academies" ON public.academies;

CREATE POLICY "Authenticated users can create academies"
ON public.academies
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- =================================================================
-- 3. ACADEMY MEMBERS INSERT: Policy de auto-unión para públicas
-- =================================================================
DROP POLICY IF EXISTS "Users can join academies" ON public.academy_members;

CREATE POLICY "Users can join public academies as members"
ON public.academy_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.academies 
    WHERE academies.id = academy_members.academy_id 
    AND academies.is_public = true
  )
);

-- =================================================================
-- 4. CORREGIR TUTORÍAS: Revisar 9 tablas (opcional, si existen)
-- =================================================================
-- Las tablas de Tutorías pueden no existir aún. Hacerlas opcionales:
DO $$
BEGIN
  -- 4a. tutoring_sessions: Añadir academy_id si la tabla existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutoring_sessions') THEN
    ALTER TABLE public.tutoring_sessions ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_academy ON public.tutoring_sessions(academy_id);
  END IF;

  -- Habilitar RLS en tablas de tutoring si existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
    ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'topics') THEN
    ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
    ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_bookings') THEN
    ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutoring_history') THEN
    ALTER TABLE public.tutoring_history ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutor_availability') THEN
    ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =================================================================
-- 5. VERIFICACIÓN: Mostrar políticas aplicadas
-- =================================================================

SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('academies', 'academy_members')
ORDER BY tablename, policyname;

-- =================================================================
-- NOTA IMPORTANTE: TESTS DE VERIFICACIÓN
-- =================================================================
-- Los tests de RLS deben ejecutarse MANUALMENTE después de aplicar
-- esta migración, en una sesión psql con el rol service_role.
-- 
-- Ejecutar el siguiente bloque de código en psql:
-- =================================================================

/*
-- ============================================================================
-- PREPARACIÓN: Crear datos de test (ejecutar como service_role)
-- ============================================================================

-- Limpiar datos de tests anteriores
DELETE FROM public.academy_members WHERE user_id::text LIKE '%a0000000%';
DELETE FROM public.academies WHERE slug LIKE 'test_%';
DELETE FROM public.profiles WHERE email LIKE '%@rls-test.com';

-- Crear usuarios de test
INSERT INTO public.profiles (id, email, role) VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'owner1@rls-test.com', 'member'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'owner2@rls-test.com', 'member'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'nonmember@rls-test.com', 'member')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Crear academias de test
INSERT INTO public.academies (id, slug, name, owner_user_id, is_public) VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'test_public_academy', 'Academia Pública Test', 'a0000000-0000-0000-0000-000000000001'::uuid, true),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'test_private_academy', 'Academia Privada Test', 'a0000000-0000-0000-0000-000000000002'::uuid, false)
ON CONFLICT (id) DO UPDATE SET is_public = EXCLUDED.is_public;

-- Crear membresías owner
INSERT INTO public.academy_members (academy_id, user_id, role) VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'owner'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'owner')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST 1: Usuario NO puede insertarse como owner
-- ============================================================================
\echo ''
\echo '=== TEST 1: Intentar insertarse como OWNER ==='
\echo 'Contexto: Usuario no-miembro intenta crear membership como owner'
\echo 'Esperado: ERROR - new row violates row-level security policy'

SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003"}';
INSERT INTO public.academy_members (academy_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'owner');

-- ============================================================================
-- TEST 2: Usuario NO puede insertarse como admin
-- ============================================================================
\echo ''
\echo '=== TEST 2: Intentar insertarse como ADMIN ==='
\echo 'Contexto: Usuario no-miembro intenta crear membership como admin'
\echo 'Esperado: ERROR - new row violates row-level security policy'

SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003"}';
INSERT INTO public.academy_members (academy_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'admin');

-- ============================================================================
-- TEST 3: Usuario SÍ puede insertarse como member en academia PÚBLICA
-- ============================================================================
\echo ''
\echo '=== TEST 3: Auto-unirse como MEMBER a academia PÚBLICA ==='
\echo 'Contexto: Usuario no-miembro se une a academia pública'
\echo 'Esperado: SUCCESS - 1 row inserted'

SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003"}';
INSERT INTO public.academy_members (academy_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'member');

-- Verificar que se insertó
\echo 'Verificación: Membership creado'
SELECT academy_id, user_id, role FROM public.academy_members 
WHERE user_id = 'a0000000-0000-0000-0000-000000000003'::uuid;

-- ============================================================================
-- TEST 4: Usuario NO puede insertarse como member en academia PRIVADA
-- ============================================================================
\echo ''
\echo '=== TEST 4: Intentar auto-unirse como MEMBER a academia PRIVADA ==='
\echo 'Contexto: Usuario no-miembro intenta unirse a academia privada'
\echo 'Esperado: ERROR - new row violates row-level security policy'

SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003"}';
INSERT INTO public.academy_members (academy_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'member');

-- ============================================================================
-- TEST 5: Academia PRIVADA no visible para no-miembro
-- ============================================================================
\echo ''
\echo '=== TEST 5: SELECT academia PRIVADA (no-miembro) ==='
\echo 'Contexto: Usuario no-miembro consulta academia privada'
\echo 'Esperado: 0 rows (no visible)'

SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003"}';
SELECT id, name, is_public FROM public.academies WHERE slug = 'test_private_academy';

-- ============================================================================
-- TEST 6: Academia PÚBLICA visible para cualquier usuario
-- ============================================================================
\echo ''
\echo '=== TEST 6: SELECT academia PÚBLICA (no-miembro) ==='
\echo 'Contexto: Usuario no-miembro consulta academia pública'
\echo 'Esperado: 1 row visible'

SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003"}';
SELECT id, name, is_public FROM public.academies WHERE slug = 'test_public_academy';

-- ============================================================================
-- LIMPIEZA FINAL
-- ============================================================================
\echo ''
\echo '=== LIMPIEZA DE DATOS DE TEST ==='

DELETE FROM public.academy_members WHERE user_id::text LIKE '%a0000000%';
DELETE FROM public.academies WHERE slug LIKE 'test_%';
DELETE FROM public.profiles WHERE email LIKE '%@rls-test.com';

\echo 'Datos de test eliminados.'

\echo ''
\echo '============================================================'
\echo 'RESUMEN DE TESTS RLS'
\echo '============================================================'
\echo 'TEST 1: Intentar insertarse como OWNER -> Error esperado ✓'
\echo 'TEST 2: Intentar insertarse como ADMIN -> Error esperado ✓'
\echo 'TEST 3: Auto-unirse como MEMBER a pública -> Success esperado ✓'
\echo 'TEST 4: Intentar auto-unirse a privada -> Error esperado ✓'
\echo 'TEST 5: Privada invisible para no-member -> 0 rows esperado ✓'
\echo 'TEST 6: Pública visible para cualquier usuario -> 1 row esperado ✓'
\echo '============================================================'
*/
