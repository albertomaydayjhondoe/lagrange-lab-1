# 🏛️ Arquitectura Lagrange Lab - PaaS Educativo

## Vista General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAGRANGE LAB - PLATAFORMA PAAS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ⚙️ MOTOR ÚNICO (El Oráculo)                      │    │
│  │                                                                      │    │
│  │   architectPrompt.ts  ──→  getEmbedding()  ──→  match_corpus_fragments() │
│  │          │                       │                      │                │
│  │          └───────────────────────┴──────────────────────┘                │
│  │                                 │                                        │
│  │                                 ▼                                        │
│  │                    ┌────────────────────────┐                          │
│  │                    │  socratic-oracle      │                          │
│  │                    │  (UNA función, nunca   │                          │
│  │                    │   se clona por academy)│                          │
│  │                    └────────────────────────┘                          │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │
│  │  Sócrates   │  │   Newton    │  │    Curie    │  ← Academias (tenants) │
│  │  ─────────  │  │  ─────────  │  │  ─────────  │                        │
│  │  corpus     │  │  corpus     │  │  corpus     │                        │
│  │  fragments  │  │  fragments  │  │  fragments  │                        │
│  └─────────────┘  └─────────────┘  └─────────────┘                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    🌐 RESpaldo Externo (Wikipedia)                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    👑 PLATFORM ADMIN                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo: Estudiante pregunta al Oráculo

```
1. FRONTEND
   Usuario pregunta: "¿Qué es el ser?"
   Academy: Sócrates (academy_id = UUID-1)

2. API REQUEST
   POST /functions/v1/socratic-oracle
   Body: { academyId: "UUID-1", context: "¿Qué es el ser?" }

3. socratic-oracle (Edge Function ÚNICA)
   ├─ Verificar auth → OK
   ├─ Verificar membresía en Sócrates → OK
   ├─ getEmbedding(pregunta) → [vector]
   ├─ match_corpus_fragments(query_embedding, match_academy_id=UUID-1)
   │   → Fragmentos de Sócrates ✓
   │   → ✗ Newton (FILTRADO por RLS)
   │   → ✗ Curie (FILTRADO por RLS)
   └─ Generar respuesta

4. RESPONSE
   { respuesta, sources, wikipedia_provenance }
```

## Aislamiento Multi-Tenant

```
Student A (Sócrates) ──→ socratic-oracle ──→ corpus_Sócrates ✓
                                              ✗ corpus_Newton  
                                              ✗ corpus_Curie   

Student B (Newton) ──→ socratic-oracle ──→ corpus_Newton ✓
                                          ✗ corpus_Sócrates
                                          ✗ corpus_Curie   

RLS asegura: academy_id filtrado en TODAS las consultas
```

## Componentes

| Componente | Tipo | Descripción |
|------------|------|-------------|
| `socratic-oracle` | Edge Function | Motor único de IA socrática |
| `architectPrompt.ts` | Shared lib | Prompt del oráculo |
| `corpusRetrieval.ts` | Shared lib | Búsqueda RAG con filtrado |
| `match_corpus_fragments` | RPC | Búsqueda vectorial por academy |
| `external-research` | Edge Function | Wikipedia fallback |
