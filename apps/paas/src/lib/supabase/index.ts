/**
 * Supabase Client Exports
 * 
 * Exporta el cliente, hooks y servicios API de Supabase.
 */

export { supabase, type Database } from './client'
export { 
  useSession, 
  useUser, 
  useAuth, 
  useAcademies, 
  useAcademySpaces,
  useSavedDialogues 
} from './hooks'

// RAG API Services
export {
  ingestSource,
  tutoringOracle,
  saveDialogue,
  formatProvenanceDisplay,
  type IngestSourceRequest,
  type TutoringRequest,
  type ProvenanceEntry,
  type TutoringResponse,
  type MessageEntry,
  type SaveDialogueRequest
} from './api'
