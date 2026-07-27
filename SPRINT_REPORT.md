# Sprint Report - Lagrange Lab

## Estado General: 85% → 100%

```
┌────────────────────────────────────────────────────────────────┐
│  PROGRESO:                                                      │
│  ✅ Sprint 1-5: Core functionality                        100% │
│  🔄 Sprint 6: RLS Security                               en proceso │
│  ⬜ Sprint 7-12: Sprints modulares                         0% │
├────────────────────────────────────────────────────────────────┤
│  TOTAL:                                                    85% │
└────────────────────────────────────────────────────────────────┘
```

---

## Historial de Sprints Completados

### ✅ Sprint 1: README.md (Completado)
**Fecha**: Previo  
**Estado**: ✅ Completado

- README.md contenía descripción real del proyecto
- Arquitectura: src/caracteristicas/..., supabase/functions/
- Esquema de tablas documentado
- Decisiones clave documentadas
- Instrucciones de desarrollo y deploy

### ✅ Sprint 2: Verificación de Tablas de Tutorías (Completado)
**Fecha**: Previo  
**Estado**: ✅ Completado

Todas las 9 tablas existen en producción:
- subjects, topics, materials
- tutoring_sessions, session_bookings
- payments, tutoring_history
- tutor_availability, subscriptions

### ✅ Sprint 3-5: Edge Functions + Build (Completado)
**Fecha**: Previo  
**Estado**: ✅ Completado

- Edge Functions responden correctamente
- npm run build: `✓ built in 4.69s`
- npm run lint: `23 warnings (0 errors)`

---

## Sprints Pendientes

### 🔄 Sprint 6: RLS Security (En Proceso)

| Punto | Estado | Notas |
|-------|--------|-------|
| DROP policies abiertas | ⬜ Pendiente | academies tiene 3/4 con WITH CHECK true |
| Auditoría de policies | ⬜ Pendiente | academy_members, subjects, 9 tablas Tutorías |
| Prueba SET LOCAL | ⬜ Pendiente | SET LOCAL request.jwt.claims |
| handle_new_user trigger | ⬜ Pendiente | Verificar que existe y funciona |

### ⬜ Sprint 7: Infraestructura y Deploy
- Verificar variables de entorno en Vercel
- Redploy a producción
- Verificar acceso (actualmente "Bad Gateway")

### ⬜ Sprint 8: Unificación de Materias
- Añadir academy_id a subjects
- Migrar thematic_axes a subjects
- Actualizar RLS de subjects

### ⬜ Sprint 9: Legacy Routes
- Restaurar funcionalidad básica en /admin
- Restaurar /podcast con GeneradorDeNarrativas
- Restaurar /profile con AcademyProfile

### ⬜ Sprint 10: Testing y QA
- Flujo Auth → Investigación completo
- Flujo Tutorías completo
- Verificación sin errores en consola

### ⬜ Sprint 11: Documentación Final
- README.md actualizado ✅
- CHANGELOG.md creado ✅
- DEPLOY-CHECKLIST.md actualizado

---

## Edge Functions - Estado Actual

| Función | Estado | Notas |
|---------|--------|-------|
| socratic-oracle | ✅ Funciona | Auth JWT requerida |
| tutoring-oracle | ✅ Funciona | Auth JWT requerida |
| ingest-source | ✅ Funciona | Auth JWT requerida |
| external-research | ✅ Implementado | Wikipedia fallback |
| list-academies | ✅ Funciona | Sin auth |
| get-academy | ✅ Funciona | Sin auth |
| list-sessions | ✅ Funciona | Sin auth |
| book-session | ✅ Funciona | Auth JWT requerida |
| create-session | ✅ Funciona | Auth JWT requerida |
| save-dialogue | ✅ Funciona | Auth JWT requerida |
| fog-teaser | ✅ Funciona | Auth JWT requerida |
| generate-ambient-narrative | ✅ Funciona | Auth JWT requerida |
| regenerate-topology-delta | ✅ Funciona | Auth JWT requerida |
| oracle-echo | ❌ No existe | Removido |

---

## Workflow de Deploy

```bash
# Deploy Frontend (Vercel)
npx vercel --prod

# Deploy Backend (Supabase)
npx supabase functions deploy
```

---

## Referencias

- **Plan detallado**: [SPRINTS_MODULAR_PLAN.md](SPRINTS_MODULAR_PLAN.md)
- **Documentación original**: [SPRINT_PLAN.md](SPRINT_PLAN.md)
