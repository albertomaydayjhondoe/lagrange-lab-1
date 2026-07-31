# Academia Lexis

> **Academia de preparación multidisciplinar** вҖ” Secundaria y oposiciones con oráculo IA socrático y biblioteca RAG para el estudio eficiente.

---

## MVP ACADEMIA LEXIS - Estado Actual

> **El oráculo aplica fricción cognitiva socrática, no es un chatbot de resúmenes.**

### Funcionalidad Operativa (Sprint 11 completado):
- Autenticación (registro/login)
- Catálogo de academia única "Academia Lexis"
- Oráculo Socrático contra corpus PAAU
- Biblioteca RAG / Aportar Apuntes

### Módulos en "Próximamente":
- Podcast, Topología, Research Lab, Pitágoras Lab
- Tutorías con tutor humano, Panel Admin avanzado

> **Los módulos fuera de scope se muestran como placeholders "Próximamente en Academia Lexis" en el menú, sin llamadas reales a Supabase.**

---

## Arquitectura

```
                    MOTOR ГҡNICO (El OrГЎculo)
                    в”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җ
  architectPrompt.ts в”Җв”ҖвҶ’ getEmbedding() в”Җв”ҖвҶ’ match_corpus_fragments()
                               вҶ“
                    socratic-oracle (UNA funciГіn)
                               в”Ӯ
         в”Ңв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”јв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”җ
         вҶ“                    вҶ“                    вҶ“
  в”Ңв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”җ    в”Ңв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”җ    в”Ңв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”җ
  в”Ӯ  SГіcrates   в”Ӯ    в”Ӯ   Newton    в”Ӯ    в”Ӯ    Curie    в”Ӯ
  в”Ӯ  corpus_A   в”Ӯ    в”Ӯ  corpus_B  в”Ӯ    в”Ӯ  corpus_C   в”Ӯ
  в”Ӯ  (aislado) в”Ӯ    в”Ӯ  (aislado) в”Ӯ    в”Ӯ  (aislado) в”Ӯ
  в””в”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”ҳ    в””в”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”ҳ    в””в”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”Җв”ҳ
```

### Motor Гҡnico

`supabase/functions/_shared/architectPrompt.ts` es la **ГҡNICA fuente** del "Primer Mandamiento". Las academias pueden personalizar el tono via `oracle_persona_prompt`, pero nunca bifurcan el motor.

### Aislamiento Multi-Tenant

- RLS filtra `corpus_fragments` por `academy_id`
- `platform_admins` son el Гәnico rol transversal
- Fallback a Wikipedia (si similarity < 0.75) con procedencia marcada

---

## Estructura

```
lagrange-lab-1/
в”ңв”Җв”Җ src/
в”Ӯ   в”ңв”Җв”Җ pages/
в”Ӯ   в”Ӯ   в”ңв”Җв”Җ OraclePage.tsx      # OrГЎculo (protagonista)
в”Ӯ   в”Ӯ   в”ңв”Җв”Җ RAGPage.tsx        # Biblioteca RAG
в”Ӯ   в”Ӯ   в””в”Җв”Җ AcademiesPage.tsx  # GestiГіn + ingesta
в”Ӯ   в””в”Җв”Җ compartido/components/
в”Ӯ       в””в”Җв”Җ MainLayout.tsx     # 5 pestaГұas: OrГЎculo, Biblioteca, Mapa, Academias, Config
в”ңв”Җв”Җ supabase/functions/
в”Ӯ   в”ңв”Җв”Җ socratic-oracle/      # UNA funciГіn para TODAS
в”Ӯ   в”ңв”Җв”Җ tutoring-oracle/       # UNA funciГіn
в”Ӯ   в””в”Җв”Җ _shared/
в”Ӯ       в”ңв”Җв”Җ architectPrompt.ts # Primer Mandamiento
в”Ӯ       в””в”Җв”Җ corpusRetrieval.ts  # RAG con filtrado
в””в”Җв”Җ docs/
    в””в”Җв”Җ ARCHITECTURE.md        # Diagrama completo
```

---

## Quick Start

```bash
# Instalar
npm install

# Desarrollo
npm run dev

# Build
npm run build
```

Variables necesarias:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

---

## Conceptos Clave

| Concepto | DescripciГіn |
|---------|-------------|
| **Academia** | Tenant aislado con corpus propio |
| **Materia** | ГҒtomo Гәnico: eje del orГЎculo + materia de tutorГӯa |
| **Motor Гҡnico** | Una Edge Function sirve a todas las academias |
| **Capa Viva** | Mapa mutante, niebla, eco, radio |

---

## Deploy

- **Frontend**: Vercel (automГЎtico via GitHub)
- **Backend**: Supabase Edge Functions
- **Self-hosted**: Docker Compose (`README.docker.md`)
