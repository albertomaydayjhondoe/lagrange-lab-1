# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [2.0.0] - 2026-07-31

### Added

#### Academia Lexis MVP
- **Rebranding**: Todo el UI ahora muestra "Academia Lexis"
- **Feature Flags**: Sistema de flags para módulos fuera de scope
  - `VITE_FEATURE_PODCAST`
  - `VITE_FEATURE_TOPOLOGIA`
  - `VITE_FEATURE_RESEARCH`
  - `VITE_FEATURE_PITAGORAS`
  - `VITE_FEATURE_TUTORIAS_TUTOR`
  - `VITE_FEATURE_ADMIN_AVANZADO`

- **Placeholder Components**: Módulos fuera de scope muestran "Próximamente en Academia Lexis"
  - Podcast, Topología, Research Lab, Pitágoras Lab
  - Tutorías con tutor humano, Panel Admin avanzado

- **Seed Academia Lexis PAAU**: Materias de preparación para selectividad
  - Lengua Castellana, Historia de España
  - Matemáticas, Filosofía, Inglés
  - Latín, Economía, Física

### Changed

- **UI**: "Lagrange" → "Academia Lexis" en toda la navegación
- **Rutas legacy**: Ya no redirigen a /academies, muestran placeholders
- **README**: Actualizado con estado MVP

## [1.0.0] - 2026-07-27

### Added

#### Core Features
- **ResearchLab**: Sistema RAG multi-formato completo
  - Flujo de usuario: Auth → Academia → Materia → Upload → Chat
  - Carga de materiales (texto y URLs)
  - Chat con provenance de fuentes
  - Guardado de sesiones

- **Academies Multi-Tenant**
  - Creación y gestión de academias
  - Sistema de membresías (admin, member, tutor)
  - Roles de plataforma (platform_admins)

- **Socratic Oracle**
  - Generación de preguntas socráticas con contexto RAG
  - Integración con Wikipedia como fallback

- **Tutoring Oracle**
  - Chat de tutorías con materiales
  - Búsqueda vectorial en corpus

- **External Research**
  - Wikipedia API integration
  - Rate limiting (1 llamada/academia/60s)
  - Degradación con gracia

- **Edge Functions** (20+ funciones)
  - `socratic-oracle`: Preguntas socráticas con RAG
  - `tutoring-oracle`: Chat de tutorías
  - `ingest-source`: Procesamiento de materiales
  - `match_corpus_fragments`: Búsqueda vectorial
  - `external-research`: Wikipedia fallback
  - `book-session`, `create-session`, `list-sessions`: Tutorías
  - `save-dialogue`: Guardado de conversaciones
  - `fog-teaser`, `generate-ambient-narrative`: Narrativa

#### Database Schema
- Tablas core: academies, academy_members, profiles, platform_admins
- Topología: topology_nodes, topology_edges
- Corpus: corpus_fragments, socratic_questions, saved_dialogues
- Tutorías: subjects, topics, materials, tutoring_sessions, session_bookings, tutoring_history, tutor_availability, subscriptions

#### Security
- Row Level Security (RLS) en todas las tablas
- Funciones helper con SECURITY DEFINER
- Prevención de recursión en policies

#### Infrastructure
- Vite + React + TypeScript frontend
- Supabase (Postgres + Edge Functions) backend
- Vercel deployment
- Tailwind CSS + shadcn/ui

### Changed

- **Rutas**: Legacy routes ahora redirigen a /research
- **Arquitectura**: Estructura modular por características

### Fixed

- RLS recursion issue en academy_members
- Policies abiertas en academies
- Validación de URLs en Supabase client

## [0.x.x] - Versiones anteriores

### Versiones anteriores no documentadas

---

## Formato de commits

```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formateo, style (sin cambio de lógica)
refactor: refactorización de código
perf: mejoras de rendimiento
test: agregar tests
chore: mantenimiento, dependencies
```

## Guías

- **Breaking Changes**: Marcadas con `⚠️` en la descripción
- **Deprecations**: Listadas con versión de deprecated y removal
- **Security**: Vulnerabilidades reportadas vía GitHub Security Advisories
