# Lagrange Lab - Supabase Context

## Project Specific Configuration

This file provides specific context for the Lagrange Lab project.

**Project ID:** `naikdjreibbugblihgwl`
**Project URL:** https://naikdjreibbugblihgwl.supabase.co

## Tables

### corpus_fragments
Stores RAG fragments with provenance.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| source_file | TEXT | Original filename |
| source_type | TEXT | pdf, audio, video, url, imagen, csv |
| content | TEXT | Fragment content |
| academy_id | UUID | FK to academies |
| space_id | UUID | FK to academy_spaces (dynamic) |
| embedding | vector(1536) | pgvector embedding |
| uploaded_by | UUID | User who uploaded |
| ingested_at | TIMESTAMPTZ | Ingestion timestamp |
| similarity_score | FLOAT | For provenance display |
| page_reference | TEXT | PDF page, video minute, etc |

### saved_dialogues
Stores research sessions with provenance.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Session owner |
| academy_id | UUID | FK to academies |
| space_id | UUID | FK to academy_spaces |
| research_topic | TEXT | Research topic |
| total_sources_used | INT | Count of sources |

### saved_dialogue_provenance
Stores provenance for each message.

| Column | Type | Notes |
|--------|------|-------|
| is_inference_only | BOOLEAN | ⚠️ AI inference without source |
| similarity_score | FLOAT | Semantic similarity (0-1) |
| citation_order | INT | Order of citation in response |

## Edge Functions

### ingest-source
Accepts: `text`, `url`, or `file` (base64)
Returns: `chunks_created`, `source_type`, `normalized`

### tutoring-oracle
Accepts: `academyId`, `spaceId`, `question`, `conversationHistory`
Returns: `response`, `provenance[]`, `has_inference_only`

### save-dialogue
Accepts: `messages[]` with `provenance[]` per message
Returns: `dialogue_id`, `total_messages`, `total_sources_used`

## RLS Policies

Always check these before querying:
- `corpus_fragments`: Filter by `academy_id` and `space_id`
- `saved_dialogues`: Only owner (`user_id = auth.uid()`) can read
- `saved_dialogue_provenance`: Inherited from parent message
