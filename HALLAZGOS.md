# HALLAZGOS - Academia Lexis MVP

## Hallazgos fuera de scope (no se corrigen de paso)

---

## Sprint 7 - Infraestructura y Deploy

### Estado: ✅ VERIFICADO

**URL de producción:**
- `https://lagrange-lab-1.vercel.app` → 200 OK ✅
- Assets JS/CSS cargan correctamente ✅
- Sin errores de CORS (access-control-allow-origin: *) ✅

**URLs work-1/work-2 (hosts internos del usuario):**
- `https://work-1-nakmejzxsslbmnry.prod-runtime.all-hands.dev/` → 502 Bad Gateway
- `https://work-2-nakmejzxsslbmnry.prod-runtime.all-hands.dev/` → 502 Bad Gateway
- **NOTA**: Estas URLs son diferentes de la URL de producción de Vercel

**Build y Lint:**
- ✅ `npm run build` → Exitoso (7.00s)
- ⚠️ `npm run lint` → 32 warnings (0 errors) - todos relacionados con react-hooks/exhaustive-deps y react-refresh

---

## Sprint 7bis - Rebranding Academia Lexis

### Completado:
- ✅ `LagrangeNav.tsx` → "Academia Lexis"
- ✅ `CampusNav.tsx` → "Academia Lexis"
- ✅ `MainLayout.tsx` → "Academia Lexis"
- ✅ `Index.tsx` → "Academia Lexis" + tagline actualizada
- ✅ `index.html` → title, meta tags, lang="es"
- ✅ `README.md` → sección MVP actualizada

---

## Sprint 8 - Mock PAAU + unificación de materias

### Completado (datos en Supabase):
- ✅ Academia "Academia Lexis" insertada con ID `00000000-0000-0000-0000-000000000002`
- ✅ 8 materias PAAU insertadas:
  - Economía, Filosofía, Física, Historia de España
  - Inglés, Latín, Lengua Castellana, Matemáticas
- ✅ 4 fragmentos de corpus de ejemplo insertados para pruebas del Oráculo
- ✅ Seed file `20260731000000_seed_academia_lexis_paau.sql` disponible para futuras ejecuciones

---

## Sprint 9 - Seguridad RLS

### Completado (funciones en Supabase):
- ✅ Función `user_is_academy_member()` con SECURITY DEFINER
- ✅ Función `user_is_academy_owner()` con SECURITY DEFINER
- ✅ Función `user_has_admin_role()` con SECURITY DEFINER
- ⚠️ RLS policies fueron parcialmente aplicadas (requiere verificación manual via Supabase Dashboard)

### NOTA: 
El Management API de Supabase no permite ejecutar `ALTER TABLE DISABLE ROW LEVEL SECURITY`, por lo que algunas migraciones SQL no se ejecutaron completamente. Las funciones RLS fueron creadas manualmente.

---

## Sprint 10bis - Modo dummy módulos fuera de scope

### Completado:
- ✅ Feature flags en `.env`:
  - `VITE_FEATURE_PODCAST=false`
  - `VITE_FEATURE_TOPOLOGIA=false`
  - `VITE_FEATURE_RESEARCH=false`
  - `VITE_FEATURE_PITAGORAS=false`
  - `VITE_FEATURE_TUTORIAS_TUTOR=false`
  - `VITE_FEATURE_ADMIN_AVANZADO=false`
- ✅ `src/config/featureFlags.ts` - helper `isFeatureEnabled()`
- ✅ `src/components/ComingSoonPlaceholder.tsx` - componente placeholder
- ✅ `rutas.tsx` - actualizadas con placeholders para /podcast, /research, /admin, etc.

### Rutas con placeholders:
- `/podcast` → Podcast Educativo
- `/map`, `/topologia` → Topología del Conocimiento
- `/research`, `/lab` → Research Lab
- `/pitagoras`, `/pitagoras-lab` → Pitágoras Lab
- `/admin` → Panel de Administración
- `/carrera/:slug/tutorias` → Tutorías con Tutor Humano

---

## Sprint 12 - Documentación final MVP

### Completado:
- ✅ `README.md` - sección MVP Academia Lexis
- ✅ `CHANGELOG.md` - entrada v2.0.0 Academia Lexis MVP
- ✅ `DEPLOY-CHECKLIST.md` - actualizado con feature flags y migraciones

---

## Hallazgos varios

### Código legacy identificado (NO se toca en este MVP):
- `src/caracteristicas/podcast/` - GeneradorDeNarrativas.tsx, RadioPlayer.tsx
- `src/caracteristicas/topologia/` - LagrangeMap.tsx, FogOverlay.tsx
- `src/caracteristicas/research/` - ResearchLab.tsx
- `src/caracteristicas/tutorias/` - DashboardTutor.tsx, CrearSesion.tsx
- `src/caracteristicas/administracion/` - Admin.tsx, editores

### Tablas Supabase identificadas:
- `subjects` - materias (con academy_id)
- `thematic_axes` - ejes temáticos legacy (migrados a subjects)
- `academies` - academias multi-tenant
- `academy_members` - membresías
- `corpus_fragments` - fragmentos RAG

### Edge Functions:
- `socratic-oracle` - Motor IA principal
- `list-academies` - Lista de academias
- `student-oracle` - Oracle por estudiante
- `ingest-material` - Upload de materiales

---

**Última actualización:** 2026-07-31
