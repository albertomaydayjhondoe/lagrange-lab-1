# Lagrange Lab

> **PaaS de universidad multidisciplinar** — múltiples academias-inquilino, cada una con sus propias materias y corpus, todas servidas por el **MISMO motor de oráculo socrático**.

---

## CONCEPTO NO NEGOCIABLE

**El oráculo aplica fricción cognitiva socrática, no es un chatbot de resúmenes.**

- Preguntas que **incomodan** en vez de complacer
- El "Primer Mandamiento" de `architectPrompt.ts` es inviolable
- Capa viva: mapa que muta, niebla, eco del oráculo, radio ambiental
- Si algún cambio suaviza o elimina esa fricción, **detente y repórtalo**

---

## Arquitectura

```
                    MOTOR ÚNICO (El Oráculo)
                    ────────────────────────
  architectPrompt.ts ──→ getEmbedding() ──→ match_corpus_fragments()
                               ↓
                    socratic-oracle (UNA función)
                               │
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │  Sócrates   │    │   Newton    │    │    Curie    │
  │  corpus_A   │    │  corpus_B  │    │  corpus_C   │
  │  (aislado) │    │  (aislado) │    │  (aislado) │
  └─────────────┘    └─────────────┘    └─────────────┘
```

### Motor Único

`supabase/functions/_shared/architectPrompt.ts` es la **ÚNICA fuente** del "Primer Mandamiento". Las academias pueden personalizar el tono via `oracle_persona_prompt`, pero nunca bifurcan el motor.

### Aislamiento Multi-Tenant

- RLS filtra `corpus_fragments` por `academy_id`
- `platform_admins` son el único rol transversal
- Fallback a Wikipedia (si similarity < 0.75) con procedencia marcada

---

## Estructura

```
lagrange-lab-1/
├── src/
│   ├── pages/
│   │   ├── OraclePage.tsx      # Oráculo (protagonista)
│   │   ├── RAGPage.tsx        # Biblioteca RAG
│   │   └── AcademiesPage.tsx  # Gestión + ingesta
│   └── compartido/components/
│       └── MainLayout.tsx     # 5 pestañas: Oráculo, Biblioteca, Mapa, Academias, Config
├── supabase/functions/
│   ├── socratic-oracle/      # UNA función para TODAS
│   ├── tutoring-oracle/       # UNA función
│   └── _shared/
│       ├── architectPrompt.ts # Primer Mandamiento
│       └── corpusRetrieval.ts  # RAG con filtrado
└── docs/
    └── ARCHITECTURE.md        # Diagrama completo
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

| Concepto | Descripción |
|---------|-------------|
| **Academia** | Tenant aislado con corpus propio |
| **Materia** | Átomo único: eje del oráculo + materia de tutoría |
| **Motor Único** | Una Edge Function sirve a todas las academias |
| **Capa Viva** | Mapa mutante, niebla, eco, radio |

---

## Deploy

- **Frontend**: Vercel (automático via GitHub)
- **Backend**: Supabase Edge Functions
- **Self-hosted**: Docker Compose (`README.docker.md`)
