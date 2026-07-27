# 🚀 Plan de Sprints - Eficiencia Modular

## Estado General: 85% → 100%

```
┌────────────────────────────────────────────────────────────────┐
│  PROGRESO ACTUAL                                                │
├────────────────────────────────────────────────────────────────┤
│  ✅ Sprint 1: README.md documentado                    [100%]   │
│  ✅ Sprint 2: Tablas de Tutorías verificadas           [100%]   │
│  ✅ Sprint 3: Edge Functions funcionando                [100%]   │
│  ✅ Sprint 4: npm build + lint exitosos                [100%]   │
│  ❌ Sprint 5: Deploy Vercel                            [ 30%]   │
│  ❌ Sprint 6: Seguridad RLS                              [  0%]   │
├────────────────────────────────────────────────────────────────┤
│  🔄 NUEVOS SPRINTS REQUERIDOS                                   │
├────────────────────────────────────────────────────────────────┤
│  ⬜ Sprint 7: Infraestructura y Deploy                  [  0%]   │
│  ⬜ Sprint 8: Unificación de Materias                  [  0%]   │
│  ⬜ Sprint 9: Seguridad Completa                        [  0%]   │
│  ⬜ Sprint 10: Legacy Routes Funcionalidad             [  0%]   │
│  ⬜ Sprint 11: Testing y QA                            [  0%]   │
│  ⬜ Sprint 12: Documentación Final                     [  0%]   │
├────────────────────────────────────────────────────────────────┤
│  TOTAL SISTEMA                                    [ 85%→100%]  │
└────────────────────────────────────────────────────────────────┘
```

---

## 📋 Sprint 7: Infraestructura y Deploy

### Objetivo
Resolver "Bad Gateway" y dejar la aplicación accesible en producción.

### Tareas

#### 7.1 Verificar Variables de Entorno en Vercel
```bash
# Verificar en dashboard de Vercel o via CLI
vercel env pull
```

**Variables requeridas:**
```
VITE_SUPABASE_PROJECT_ID=naikdjreibbugblihgwl
VITE_SUPABASE_PUBLISHABLE_KEY=<from Supabase dashboard>
VITE_SUPABASE_URL=https://naikdjreibbugblihgwl.supabase.co
```

#### 7.2 Redploy de Producción
```bash
npx vercel --prod --yes
```

#### 7.3 Verificación Post-Deploy
```bash
# Test básico
curl -s "https://lagrange-lab-1.vercel.app/" | head -c 500

# Verificar recursos estáticos
curl -sI "https://lagrange-lab-1.vercel.app/assets/index-*.js" | head -5
```

### Criterio de Éxito
- [ ] URL principal responde con 200
- [ ] Recursos JS/CSS cargan correctamente
- [ ] Sin errores de CORS

---

## 📋 Sprint 8: Unificación de Materias

### Objetivo
Consolidar `thematic_axes` y `subjects` en un solo modelo `subjects` con `academy_id`.

### Estado Actual
- `thematic_axes`: Ejes temáticos legacy
- `subjects`: Materias de tutorías (sin academy_id)
- Objetivo: Una tabla unificada

### Tareas

#### 8.1 Añadir academy_id a subjects
```sql
-- Nueva migración
ALTER TABLE subjects ADD COLUMN academy_id UUID REFERENCES academies(id);
CREATE INDEX idx_subjects_academy ON subjects(academy_id);
```

#### 8.2 Migrar thematic_axes a subjects
```sql
-- Para cada thematic_axis crear un subject equivalente
INSERT INTO subjects (name, academy_id, description)
SELECT name, academy_id, description FROM thematic_axes;
```

#### 8.3 Actualizar RLS de subjects
```sql
-- Policy con scope de academia
CREATE POLICY "users_view_subjects_in_academy"
ON subjects FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM academy_members 
    WHERE academy_id = subjects.academy_id
  )
);
```

#### 8.4 Actualizar código frontend
```typescript
// ResearchLab.tsx - cambiar loadSpaces
const loadSpaces = async (academyId: string) => {
  const { data } = await supabase
    .from('subjects')
    .select('id, name, academy_id')
    .eq('academy_id', academyId)
    .order('name');
  setSpaces(data || []);
};
```

### Criterio de Éxito
- [ ] subjects tiene academy_id
- [ ] thematic_axes migado a subjects
- [ ] RLS permite solo miembros de academia
- [ ] Frontend usa subjects

---

## 📋 Sprint 9: Seguridad Completa

### Objetivo
Auditar y corregir todas las RLS policies para evitar acceso no autorizado.

### Tareas

#### 9.1 Listar todas las policies actuales
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### 9.2 Identificar y DROP policies abiertas
```sql
-- Ejemplo: academies con SELECT público
DROP POLICY IF EXISTS "Allow public select academies" ON academies;
```

#### 9.3 Crear función helper sin recursión
```sql
CREATE OR REPLACE FUNCTION user_is_academy_member(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM academy_members 
    WHERE academy_id = p_academy_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### 9.4 Verificar handle_new_user trigger
```sql
-- Verificar que existe
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'handle_new_user';
```

### Criterio de Éxito
- [ ] Sin policies con SELECT público en tablas sensibles
- [ ] Función helper con SECURITY DEFINER
- [ ] Trigger handle_new_user activo

---

## 📋 Sprint 10: Legacy Routes Funcionalidad

### Objetivo
Restaurar funcionalidad básica en rutas legacy para no perder funcionalidad existente.

### Mapa de Rutas

| Ruta Actual | Redirige a | Funcionalidad Objetivo |
|------------|------------|------------------------|
| `/pitagoras` | → `/research` | Legacy, mantener redirect |
| `/admin` | → `/research` | Panel admin básico |
| `/podcast` | → `/research` | Generator de narrativas |
| `/profile` | → `/research` | Perfil de usuario |
| `/academia/:slug` | → `/research` | Detalle de academia |

### Tareas

#### 10.1 Actualizar rutas para mostrar contenido funcional
```typescript
// rutas.tsx - actualizar
<Route path="/admin" element={<Admin />} />
<Route path="/podcast" element={<GeneradorDeNarrativas />} />
<Route path="/profile" element={<AcademyProfile />} />
```

#### 10.2 Crear componentes mínimos si no existen
- Verificar que `AcademyProfile.tsx` esté completo
- Verificar que `GeneradorDeNarrativas.tsx` funcione
- Verificar que `Admin.tsx` tenga funcionalidad básica

### Criterio de Éxito
- [ ] /admin muestra panel admin
- [ ] /podcast muestra generador
- [ ] /profile muestra perfil de usuario

---

## 📋 Sprint 11: Testing y QA

### Objetivo
Verificar flujo completo de usuario de principio a fin.

### Casos de Prueba

#### 11.1 Flujo Auth → Investigación
```
1. Abrir app → ResearchLab
2. Click "Regístrate" → Crear cuenta
3. Login exitoso
4. Ver academias disponibles
5. Seleccionar academia
6. Ver materias
7. Subir material (opcional)
8. Hacer pregunta
9. Ver respuesta con provenance
10. Guardar sesión
```

#### 11.2 Flujo Tutorías
```
1. Ir a /tutorias (si implementado)
2. Ver lista de materias
3. Seleccionar materia
4. Ver sesiones disponibles
5. Reservar sesión
```

### Criterio de Éxito
- [ ] Todos los flujos completan sin errores
- [ ] Sin errores en consola
- [ ] UI responde correctamente

---

## 📋 Sprint 12: Documentación Final

### Objetivo
Dejar README y documentación en estado de producción.

### Tareas

#### 12.1 README.md
- [ ] Agregar badges de estado (build, deploy)
- [ ] Agregar screenshots/videos
- [ ] Agregar credits y contributors
- [ ] Agregar license

#### 12.2 CHANGELOG.md
```markdown
# Changelog

## [1.0.0] - 2026-07-27
### Added
- ResearchLab: Sistema RAG multi-formato
- Auth con Supabase
- Academies multi-tenant
- Edge Functions para IA
- External Research con Wikipedia
```

#### 12.3 Actualizar DEPLOY-CHECKLIST.md
- Agregar pasos de verificación post-deploy
- Agregar troubleshooting común

### Criterio de Éxito
- [ ] README.md completo y actualizado
- [ ] CHANGELOG.md existe
- [ ] DEPLOY-CHECKLIST.md actualizado

---

## 📊 Resumen de Esfuerzo

| Sprint | Complejidad | Estimación |
|--------|-------------|------------|
| 7 - Infraestructura | Baja | 30 min |
| 8 - Unificación | Media | 2 horas |
| 9 - Seguridad | Alta | 3 horas |
| 10 - Legacy Routes | Media | 2 horas |
| 11 - Testing | Baja | 1 hora |
| 12 - Documentación | Baja | 30 min |

**Total estimado: ~9 horas**

---

## 🎯 Priorización Sugerida

1. **Inmediato (Sprint 7)**: Deploy funcional → 30 min
2. **Alta (Sprint 9)**: Seguridad → 3 horas  
3. **Media (Sprint 8)**: Unificación materias → 2 horas
4. **Media (Sprint 10)**: Legacy Routes → 2 horas
5. **Baja (Sprint 11)**: Testing → 1 hora
6. **Baja (Sprint 12)**: Documentación → 30 min

**Orden alternativo según criticidad:**
1. Sprint 7 (Deploy)
2. Sprint 9 (Seguridad)
3. Sprint 11 (Testing)
4. Sprint 8 (Unificación)
5. Sprint 10 (Legacy)
6. Sprint 12 (Docs)
