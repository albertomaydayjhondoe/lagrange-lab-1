/**
 * RAG API Services
 * 
 * Cliente para las Edge Functions de Supabase.
 * Implementa el flujo del flowchart RAG Multi-Formato.
 */

import { supabase } from './client'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL || 'https://naikdjreibbugblihgwl.supabase.co'

// ============================================================================
// INGEST-SOURCE: Multi-formato ingestion
// Flujo: MULTIFORMAT → INGEST_MULTI → NORMALIZE → CHUNK → EMBED → STORE
// ============================================================================

export interface IngestSourceRequest {
  academyId?: string
  spaceId?: string
  text?: string
  url?: string
  file?: string // base64
  filename?: string
  mimeType?: string
  title?: string
  pageReference?: string
}

export interface IngestSourceResponse {
  success: boolean
  source_id: string
  chunks_created: number
  status: string
  source_type: string
  normalized: boolean
  warnings?: string[]
}

export async function ingestSource(data: IngestSourceRequest): Promise<IngestSourceResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${FUNCTIONS_URL}/functions/v1/ingest-source`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to ingest source')
  }

  return response.json()
}

// ============================================================================
// TUTORING-ORACLE: RAG Research with Provenance
// Flujo: RESEARCH → R1 → R2 → R3 → R4 → R5 → PROVENANCE
// ============================================================================

export interface TutoringRequest {
  academyId: string
  spaceId?: string
  question: string
  sessionId?: string
  systemPrompt?: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  includeRag?: boolean
  maxSources?: number
}

export interface ProvenanceEntry {
  fragment_id: string
  source_file: string
  source_type: string
  source_content: string
  original_url?: string
  page_reference?: string
  similarity_score: number
  citation_order: number
  is_inference_only: boolean
  ingested_at?: string
  uploaded_by?: string
}

export interface TutoringResponse {
  response: string
  academy_id: string
  space_id?: string
  provenance: ProvenanceEntry[]
  has_inference_only: boolean
  total_sources: number
  model: string
  response_time_ms: number
  tokens_used: number
}

export async function tutoringOracle(data: TutoringRequest): Promise<TutoringResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${FUNCTIONS_URL}/functions/v1/tutoring-oracle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get tutoring response')
  }

  return response.json()
}

// ============================================================================
// SAVE-DIALOGUE: Save session with provenance
// Flujo: LOOP (No) → SAVE → saved_dialogues
// ============================================================================

export interface MessageEntry {
  role: 'user' | 'assistant' | 'system'
  content: string
  ai_model?: string
  response_time_ms?: number
  provenance?: ProvenanceEntry[]
}

export interface SaveDialogueRequest {
  dialogueId?: string
  academyId?: string
  spaceId?: string
  title?: string
  researchTopic?: string
  tutorSystemPrompt?: string
  tutorModel?: string
  messages: MessageEntry[]
  userNotes?: string
}

export interface SaveDialogueResponse {
  success: boolean
  dialogue_id: string
  total_messages: number
  total_sources_used: number
  has_inference_only: boolean
}

export async function saveDialogue(data: SaveDialogueRequest): Promise<SaveDialogueResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${FUNCTIONS_URL}/functions/v1/save-dialogue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save dialogue')
  }

  return response.json()
}

// ============================================================================
// HELPER: Format provenance for UI display
// ============================================================================

export function formatProvenanceDisplay(provenance: ProvenanceEntry[]): string {
  if (!provenance || provenance.length === 0) {
    return ''
  }

  const lines = provenance.map((p, i) => {
    const icon = getSourceTypeIcon(p.source_type)
    const similarity = (p.similarity_score * 100).toFixed(1)
    const ref = p.page_reference 
      ? ` (${p.page_reference})` 
      : p.original_url 
        ? ` [${truncateUrl(p.original_url)}]`
        : ''

    return `${i + 1}. ${icon} **${p.source_file}**${ref}\n   - Similitud: **${similarity}%**\n   - _"${truncateText(p.source_content, 150)}..."_`
  })

  return `## 📋 Fuentes Usadas (${provenance.length})\n\n${lines.join('\n\n')}`
}

function getSourceTypeIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    'pdf': '📄',
    'docx': '📝',
    'txt': '📃',
    'md': '📋',
    'audio': '🎙️',
    'video': '🎬',
    'url': '🌐',
    'imagen': '🖼️',
    'csv': '📊',
    'user_upload': '📤',
    'seed': '🌱'
  }
  return icons[sourceType] || '📄'
}

function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url
  return url.substring(0, maxLen - 3) + '...'
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen - 3) + '...'
}
