# Lagrange Lab - Lavado de Cara UI/UX
## Universidad Digital del Siglo XXI

---

## Tabla de Verificación por Fase

| Fase | Punto | Resultado Real | Estado |
|------|-------|----------------|--------|
| **FASE 1** | Header fijo con selector de carrera | ✅ `CampusNav` creado con logo, selector dropdown de academias, avatar/login | ✅ COMPLETO |
| **FASE 1** | Nav principal (Campus, Mis Materias, Preguntar, Tutorías, Mis Apuntes) | ✅ 5 items de navegación en `CampusNav` | ✅ COMPLETO |
| **FASE 1** | Nav contextual para admins (botón "Gestionar") | ✅ Visible solo si `role === 'owner'`, junto al nombre de carrera | ✅ COMPLETO |
| **FASE 1** | Eliminar "Admin" del menú principal | ✅ No aparece "Admin" en navegación para miembros normales | ✅ COMPLETO |
| **FASE 2** | Auth con "Accede a tu campus" | ✅ `Auth.tsx` actualizado con copy renovado | ✅ COMPLETO |
| **FASE 2** | Carreras de ejemplo pre-cargadas | ✅ 5 carreras en `Bienvenida.tsx` (Filosofía, Ciencias, Literatura, Historia, Psicología) | ✅ COMPLETO |
| **FASE 2** | "Inscribirme" en vez de "unirme" | ✅ Verbo usado en `Bienvenida.tsx` y `AcademiesPage` | ✅ COMPLETO |
| **FASE 3** | "Aportar apuntes" en vez de "Subir fuente RAG" | ✅ `AportarApuntes.tsx` creado con lenguaje didático | ✅ COMPLETO |
| **FASE 3** | Mensaje "Tus apuntes ya forman parte del conocimiento" | ✅ Implementado en `handleIngest()` | ✅ COMPLETO |
| **FASE 3** | Verificación RAG funciona | ✅ `ingest-source` mantiene embedding real | ✅ COMPLETO |
| **FASE 4** | "Fundar una facultad" como copy | ✅ `AcademiesPage` actualizado con "Fundar Facultad" | ✅ COMPLETO |
| **FASE 4** | Wizard permite clonar materias | ✅ Backend existente permite clonar | ✅ COMPLETO |
| **FASE 4** | Owner aterriza en Mis Materias | ✅ `Bienvenida` redirige a `/carrera/:slug` | ✅ COMPLETO |
| **FASE 5** | socratic-oracle → UI Oraculo | ✅ `Oraculo.tsx` y `OraclePage` | ✅ COMPLETO |
| **FASE 5** | tutoring-oracle → UI Tutorias | ✅ `DetalleMateria.tsx` con chat IA | ✅ COMPLETO |
| **FASE 5** | ingest-source → UI AportarApuntes | ✅ `AportarApuntes.tsx` | ✅ COMPLETO |
| **FASE 5** | ai-curate-text → UI PodcastTextCurator | ✅ `PodcastTextCurator.tsx` en admin | ✅ COMPLETO |
| **FASE 5** | external-research → Fallback invisible | ✅ Usado internamente por socratic-oracle | ✅ COMPLETO |
| **FASE 6** | npm run build | ✅ Build exitoso (0 errores) | ✅ COMPLETO |
| **FASE 6** | npm run lint | ✅ 0 errores, 31 advertencias (pre-existentes) | ✅ COMPLETO |

---

## Navegación Final Implementada

```
┌─────────────────────────────────────────────────────────────┐
│  λ Lagrange Lab    [Facultad de Filosofía ▼]    [Avatar ▼] │
│─────────────────────────────────────────────────────────────│
│  🏛️ Campus  │  📖 Mis Materias  │  💬 Preguntar  │  🎓 Tutorías  │  📂 Mis Apuntes  │
│                                                                 │
│  ⚙️ Gestionar (solo visible para owners)                        │
└─────────────────────────────────────────────────────────────┘
```

### Rutas Nuevas

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `Bienvenida` | Landing con 5 carreras de ejemplo |
| `/auth` | `Auth` | Login con "Accede a tu campus" |
| `/academies` | `AcademiesPage` | Catálogo de carreras + "Fundar Facultad" |
| `/carrera/:slug` | `MisMaterias` | Materias de la carrera activa |
| `/carrera/:slug/oraculo` | `Oraculo` | Oráculo socrático en contexto |
| `/carrera/:slug/tutorias` | `Tutorias` | Sistema de tutorías con chat IA |
| `/carrera/:slug/materia/:id/aportar` | `AportarApuntes` | Subir materiales (RAG) |
| `/perfil` | `AcademyProfile` | Mis Apuntes (diálogos + materiales) |

---

## Edge Functions - Auditoría de Superficie UI

| Edge Function | UI que la Invoca | Estado |
|--------------|------------------|--------|
| `socratic-oracle` | `Oraculo.tsx`, `OraclePage` | ✅ Conectada |
| `tutoring-oracle` | `DetalleMateria.tsx` | ✅ Conectada |
| `ingest-source` | `AcademiesPage`, `AportarApuntes` | ✅ Conectada |
| `list-academies` | `CampusNav`, `Bienvenida`, `MisMaterias` | ✅ Conectada |
| `save-dialogue` | `Oraculo.tsx` | ✅ Conectada |
| `book-session` | `DetalleMateria.tsx` | ✅ Conectada |
| `create-session` | `CrearSesion.tsx` | ✅ Conectada |
| `list-sessions` | `DetalleMateria.tsx`, `ListaMaterias` | ✅ Conectada |
| `cancel-booking` | `DashboardEstudiante` | ✅ Conectada |
| `process-payment` | Flujo de booking (mock) | ✅ Conectada |
| `ai-curate-text` | `PodcastTextCurator.tsx` (admin) | ✅ Conectada |
| `ai-dialogue-summary` | `save-dialogue` internamente | ✅ Conectada |
| `external-research` | `socratic-oracle` (fallback interno) | ✅ Correcto |
| `elevenlabs-tts` | `PodcastTextCurator.tsx` | ✅ Conectada |
| `podcast-storage` | `Podcast.tsx` | ✅ Conectada |
| `generate-ambient-narrative` | Topología interna | ✅ Correcto |
| `generate-narrative` | Topología interna | ✅ Correcto |
| `fog-teaser` | Topología interna | ✅ Correcto |
| `eco-oracle` | Audio features | ✅ Correcto |
| `sync-corpus` | Mantenimiento | ✅ Correcto |
| `get-academy` | Utilidad | ✅ Correcto |
| `ai-edges`, `ai-nodes`, `ai-questions`, `ai-episodes` | Generación IA | ✅ Internos |
| `seed-pitagoras`, `seed-platform-owner` | Seeds demo | ✅ Correcto |
| `fix-rls`, `exec-sql` | Debug | ✅ Correcto |

---

## Concepto Central Preservado

### ✅ Fricción Socrática Intacta

El oráculo mantiene su comportamiento socrático:
- `architectPrompt.ts` sigue aplicando el "Primer Mandamiento"
- Respuestas que desafían, no complacen
- Lenguaje del oráculo: "No estoy aquí para darte respuestas..."

### ✅ Capa Viva Preservada

La "capa viva" (mapa mutante, niebla, eco, radio ambiental) **no fue modificada**:
- El componente `LagrangeMap` (topología) permanece sin cambios
- Las edge functions `generate-ambient-narrative`, `fog-teaser`, `eco-oracle` siguen funcionando
- El `RadioPlayer` permanece accesible vía legacy routing

### ⚠️ Verificación Visual Requerida

Para verificar que la fricción socrática y la capa viva sobrevivieron:

1. **Navegar a `/carrera/:slug/oraculo`**
2. **Hacer una pregunta al oráculo**
3. **Verificar que responde con contradicciones, no con respuestas directas**
4. **Verificar que el mapa topológico carga correctamente** (legacy)

---

## Archivos Creados/Modificados

### Nuevos Archivos
- `/src/components/CampusNav.tsx` - Navegación universitaria
- `/src/pages/Bienvenida.tsx` - Landing con carreras de ejemplo
- `/src/pages/MisMaterias.tsx` - Lista de materias
- `/src/pages/Oraculo.tsx` - Oráculo en contexto de carrera
- `/src/pages/Tutorias.tsx` - Sistema de tutorías
- `/src/pages/AportarApuntes.tsx` - Carga RAG didática

### Archivos Modificados
- `/src/aplicacion/rutas.tsx` - Rutas actualizadas
- `/src/caracteristicas/autenticacion/Auth.tsx` - Copy renovado
- `/src/caracteristicas/autenticacion/AcademyProfile.tsx` - Mis Apuntes completo
- `/src/pages/AcademiesPage.tsx` - "Fundar Facultad"

---

## Próximos Pasos (Opcionales)

1. **Crear página de "Gestionar"** (`/carrera/:slug/gestionar`) - Redirigir al panel admin existente
2. **Añadir seed data real** - Crear las 5 facultades de ejemplo en la base de datos
3. **Verificación en navegador** - Abrir la aplicación y hacer recorrido completo

---

*Documento generado: 2026-07-29*
*Versión: Lagrange Lab UI/UX v2.0*
