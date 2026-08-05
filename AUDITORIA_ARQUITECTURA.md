# AUDITORÍA DE ARQUITECTURA — Academia Lexis

**Fecha:** 2026-08-05  
**Sprint:** 1 — Auditoría y Mermaid Real  
**Estado:** ✅ COMPLETADO

---

## 1. RESUMEN EJECUTIVO

El código actual implementa un **MVP funcional** del Oráculo Socrático con RAG, pero los módulos de segundo nivel (Podcast, Topología, Research, Pitágoras, Tutorías con tutor, Admin avanzado) están **desactivados mediante feature flags** y reemplazados por placeholders "Próximamente".

### Nivel de implementación actual:
| Módulo | Estado | Feature Flag |
|--------|--------|--------------|
| Oráculo Socrático | ✅ REAL | N/A |
| Biblioteca RAG | ✅ REAL | N/A |
| Aportar Apuntes | ✅ REAL | N/A |
| Podcast | ⚠️ PLACEHOLDER | `VITE_FEATURE_PODCAST=false` |
| Topología | ⚠️ PLACEHOLDER | `VITE_FEATURE_TOPOLOGIA=false` |
| Research Lab | ⚠️ PLACEHOLDER | `VITE_FEATURE_RESEARCH=false` |
| Pitágoras Lab | ⚠️ PLACEHOLDER | `VITE_FEATURE_PITAGORAS=false` |
| Tutorías (tutor) | ⚠️ PLACEHOLDER | `VITE_FEATURE_TUTORIAS_TUTOR=false` |
| Admin Avanzado | ⚠️ PLACEHOLDER | `VITE_FEATURE_ADMIN_AVANZADO=false` |

---

## 2. DIVERGENCIAS VS. CONTRATO DE 3 NIVELES DE SOBERANÍA

### 2.1 Contrato Original (flowchart_3niveles.mmd)

El contrato define:

**Nivel 1 — PaaS (Soberanía de Plataforma):**
- Provisión de tenants
- Branding/White-label
- Core/Runtime (llm-gateway, rag-engine, function-registry)
- Planes y límites

**Nivel 2 — SaaS (Soberanía de Academia):**
- Alta/Baja de estudiantes
- Gestión de asignaturas
- Corpus RAG por asignatura
- Activación de features

**Nivel 3 — Estudiante:**
- Selección de asignaturas
- Notas personales (Aportar Apuntes)
- Historial Q&A del Oráculo
- Portfolio personal

### 2.2 Estado Actual vs. Contrato

| Componente | Contrato | Estado Actual | Divergencia |
|------------|----------|--------------|-------------|
| **Panel de Plataforma** | L1 - Super admin ve todo | ❌ NO EXISTE | **CRÍTICA** |
| **Panel de Academia** | L2 - Tutor/Owner gestiona | ⚠️ Admin.tsx existe pero es académico, no colapsado | MEDIA |
| **Mi Portfolio** | L3 - Alumno ve su espacio | ⚠️分散ado en /perfil y /carrera | MEDIA |
| **Navegación de 2 puntos** | Soberanía Admin + Aprendizaje | ❌ NO EXISTE (múltiples menús) | **CRÍTICA** |

### 2.3 Flujo IO (Centro → Alumno → Centro)

El flujo IO está **parcialmente implementado**:

✅ **Implementado:**
- Centro sube corpus por asignatura (`/carrera/:slug/materia/:id/aportar`)
- Alumno consulta vía Oráculo (pregunta → pregunta socrática, nunca respuesta directa)
- Historial se guarda en `saved_dialogues`

⚠️ **No implementado:**
- Portfolio del alumno no está consolidado como espacio único
- Centro no tiene auditoría de agregados (solo ve sus propios datos)

---

## 3. MAPA DE RUTAS ACTUALES

### 3.1 Rutas Funcionales (llaman a Supabase real)

```
/                                  → PAAUPage (landing)
/auth                              → AuthPage (login/registro)
/carrera/:slug                     → (implícito en navigation)
/carrera/:slug/oraculo             → Oraculo.tsx (→ socratic-oracle)
/carrera/:slug/materia/:id/aportar → AportarApuntes.tsx (→ ingest-source)
/oracle                            → OraclePage.tsx
/oracle/:mode                      → OraclePage.tsx
/library                           → RAGPage.tsx
/rag                               → RAGPage.tsx
/config                            → Configuracion.tsx
/settings                          → Configuracion.tsx
/perfil                            → AcademyProfile.tsx (mis diálogos)
/academies                         → AcademiesPage.tsx
/academies/create                  → CrearAcademia.tsx
```

### 3.2 Rutas Placeholder (ComingSoonPlaceholder)

```
/map           → Topología del Conocimiento (placeholder)
/topologia     → Topología del Conocimiento (placeholder)
/research      → Research Lab (placeholder)
/lab           → Laboratorio (placeholder)
/pitagoras     → Pitágoras Lab (placeholder)
/pitagoras-lab → Pitágoras Lab (placeholder)
/podcast       → Podcast Educativo (placeholder)
/admin         → Panel de Administración (placeholder)
/carrera/:slug/tutorias → Tutorías con Tutor Humano (placeholder)
```

### 3.3 Componentes Existentes Pero No Ruteados

```
src/caracteristicas/podcast/Podcast.tsx      → Existe, no ruteado
src/caracteristicas/topologia/MapaDeLagrange.tsx → Existe, no ruteado
src/caracteristicas/research/ResearchLab.tsx   → Existe, no ruteado
src/caracteristicas/tutorias/DashboardTutor.tsx → Existe, no ruteado
src/caracteristicas/administracion/Admin.tsx    → Existe, parcialmente ruteado
src/caracteristicas/oraculo/OraculoSocratico.tsx → Existe, usado por OraclePage
```

---

## 4. EDGE FUNCTIONS — ESTADO REAL

### 4.1 Funcionales y Probadas

| Función | Descripción | Estado |
|---------|-------------|--------|
| `socratic-oracle` | Motor IA socrático con RAG + Wikipedia | ✅ COMPLETA |
| `external-research` | Búsqueda Wikipedia fallback | ✅ COMPLETA |
| `list-academies` | Lista academias del usuario | ✅ COMPLETA |
| `get-academy` | Detalle de academia | ✅ COMPLETA |
| `save-dialogue` | Guardar diálogos | ✅ COMPLETA |
| `ingest-source` | Ingerir fuentes RAG | ✅ COMPLETA |
| `fog-teaser` | Generador de teasers para topología | ✅ COMPLETA |

### 4.2 Funcionales Pero No Conectadas

| Función | Descripción | Estado |
|---------|-------------|--------|
| `tutoring-oracle` | Oracle para tutorías | ✅ COMPLETA |
| `book-session` | Reservar sesión | ✅ COMPLETA |
| `create-session` | Crear sesión | ✅ COMPLETA |
| `regenerate-topology-delta` | Regenerar delta de topología | ✅ COMPLETA |
| `ai-nodes` | Generar nodos con IA | ✅ COMPLETA |
| `ai-edges` | Generar aristas con IA | ✅ COMPLETA |
| `ai-questions` | Generar preguntas con IA | ✅ COMPLETA |

### 4.3 Potencialmente Dummy o Incompletas

| Función | Descripción | Observación |
|---------|-------------|-------------|
| `ai-curate-text` | Curación de texto | Posible dummy |
| `ai-dialogue-summary` | Resumen de diálogos | Posible dummy |
| `ai-episodes` | Generación de episodios | Posible dummy |
| `elevenlabs-tts` | Text-to-Speech | Requiere API key |
| `generate-narrative` | Narrativas | Requiere revisión |
| `podcast-storage` | Storage de podcasts | Requiere bucket |

---

## 5. TABLAS SUPABASE

### 5.1 Tablas Existentes y Funcionales

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `profiles` | Perfiles de usuario | ✅ |
| `academies` | Academias multi-tenant | ✅ |
| `academy_members` | Membresías | ✅ |
| `academy_spaces` | Espacios/materias | ✅ |
| `corpus_fragments` | Fragmentos RAG | ✅ |
| `topology_nodes` | Nodos de topología | ✅ |
| `topology_edges` | Aristas de topología | ✅ |
| `socratic_questions` | Preguntas socráticas | ✅ |
| `podcast_episodes` | Episodios de podcast | ✅ |
| `saved_dialogues` | Diálogos guardados | ✅ |
| `tutoring_sessions` | Sesiones de tutoría | ✅ |
| `session_bookings` | Reservas de sesiones | ✅ |
| `subjects` | Materias (legacy) | ⚠️ |

### 5.2 Tablas que Requieren RLS Adicional

- `podcast_episodes` — Necesita policies para acceso por academia
- `tutoring_sessions` — Necesita filtro por tutor/alumno

### 5.3 Tablas Faltantes para Admin de Plataforma

- `platform_plans` — No existe (planes SaaS)
- `platform_subscriptions` — No existe (suscripciones)
- `platform_audit_log` — No existe (auditoría agregada)

---

## 6. COMPONENTES DE NAVEGACIÓN ACTUALES

### 6.1 Navegación Principal

| Componente | Ubicación | Función |
|------------|-----------|---------|
| `LagrangeNav` | `src/components/LagrangeNav.tsx` | Nav principal (landing) |
| `CampusNav` | `src/components/CampusNav.tsx` | Nav para campus autenticado |

### 6.1 Problemas de Navegación Identificados

1. **CampusNav tiene navegación복잡다 (demasiados items):**
   - Campus, Mis Materias, Preguntar, Tutorías, Mis Apuntes, Gestionar
   - Mezcla funcionalidades de L2 y L3 en un solo menú

2. **No hay punto de entrada "Soberanía Administrativa":**
   - El `/admin` es placeholder
   - El acceso a gestión está disperso

3. **Los módulos placeholder no están integrados:**
   - Cada módulo tiene su propia navegación
   - No hay coherencia visual

---

## 7. ANÁLISIS DE SOBERANÍA

### 7.1 Soberanía de Plataforma (L1) — **NO IMPLEMENTADA**

```
✅ Implementado:
   - Supabase multi-tenant con academy_id

❌ No implementado:
   - Panel de super-admin
   - Gestión de planes
   - Aprovisionamiento de tenants
   - Auditoría de plataforma
```

### 7.2 Soberanía de Academia (L2) — **PARCIALMENTE IMPLEMENTADA**

```
✅ Implementado:
   - Gestión de miembros (academy_members)
   - Gestión de espacios/materias
   - Admin.tsx (dentro de academia)

❌ No implementado:
   - Panel unificado (sobrescrito por /admin placeholder)
   - Auditoría agregada de alumnos
   - Activación de features por plan
```

### 7.3 Soberanía de Estudiante (L3) — **PARCIALMENTE IMPLEMENTADA**

```
✅ Implementado:
   - Selección de asignaturas
   - Oráculo Socrático
   - Aportar Apuntes
   - Portfolio de diálogos

❌ No implementado:
   - Portfolio consolidado como espacio único
   - Integración con Podcast/Research/Pitágoras
   - Vista unificada del aprendizaje
```

---

## 8. DIVERGENCIAS CRÍTICAS RESUMIDAS

| # | Divergencia | Criticidad | Acción Requerida |
|---|-------------|------------|------------------|
| 1 | No existe panel de L1 (super-admin) | 🔴 CRÍTICA | Crear componente nuevo |
| 2 | Navegación no colapsada a 2 puntos | 🔴 CRÍTICA | Rediseñar routing |
| 3 | Módulos reales no conectados | 🟡 MEDIA | Conectar feature flags |
| 4 | Admin disperso entre academias | 🟡 MEDIA | Unificar bajo Soberanía Admin |
| 5 | Portfolio no consolidado | 🟡 MEDIA | Integrar bajo Aprendizaje |
| 6 | Auditoría agregada no existe | 🟡 MEDIA | Agregar tabla + vista |

---

## 9. HALLAZGOS FUERA DE SCOPE

Los siguientes hallazgos no se corrigieron en este sprint y quedan documentados para sprints futuros:

### 9.1 Legacy Técnico

- `subjects` vs `academy_spaces` — tabla duplicada, migrar a espacios
- Feature flags en `.env` pero no hay override en UI para testing
- No hay documentación de API interna

### 9.2 RLS Incompleto

- `podcast_episodes` necesita políticas específicas por academia
- `tutoring_sessions` necesita filtro por tutor (no solo por academia)

### 9.3 UX/UI

- `PAAUPage` parece ser un landing genérico, no la página principal de Academia Lexis
- Falta indicador visual de "modo simulación" en tutorías (payment)

---

## 10. PRÓXIMOS PASOS (Sprint 2)

1. **Diseñar SoberaniaNav** — Componente raíz para L1/L2
2. **Diseñar AprendizajeNav** — Componente para L3
3. **Definir árbol de routing** — 2 puntos de entrada
4. **Generar Mermaid de navegación** — Documentar diseño

---

## APÉNDICE: COMANDOS DE VERIFICACIÓN

```bash
# Ver feature flags actuales
grep -r "VITE_FEATURE" /workspace/project/lagrange-lab-1/.env 2>/dev/null || echo "No .env encontrado"

# Ver estado de rutas
grep -n "ComingSoonPlaceholder" /workspace/project/lagrange-lab-1/src/aplicacion/rutas.tsx

# Ver Edge Functions implementadas
ls -la /workspace/project/lagrange-lab-1/supabase/functions/*/index.ts | wc -l

# Ver tablas con RLS
grep -l "ENABLE ROW LEVEL SECURITY" /workspace/project/lagrange-lab-1/supabase/migrations/*.sql
```
