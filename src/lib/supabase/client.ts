/**
 * Supabase Client Configuration
 * 
 * Configuración del cliente de Supabase para el frontend.
 * Usa variables de entorno de Vercel.
 */

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../env'

const supabaseUrl = SUPABASE_URL
const supabaseAnonKey = SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipos TypeScript para las tablas principales
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      // Tabla de rectores con soberanía institucional
      academia_rectors: {
        Row: {
          id: string
          user_id: string
          academy_id: string
          title: string
          appointed_at: string
          appointed_by: string | null
          decree_number: string | null
          institution_oath: string | null
          rector_seal_url: string | null
          is_active: boolean
          is_current: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['academia_rectors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['academia_rectors']['Insert']>
      }
      // Roles de miembros extendidos con rol 'rector'
      academy_members: {
        Row: {
          academy_id: string
          user_id: string
          role: 'owner' | 'admin' | 'platon' | 'member' | 'rector'
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['academy_members']['Row'], 'joined_at'>
        Update: Partial<Database['public']['Tables']['academy_members']['Insert']>
      }
      academies: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          owner_user_id: string | null
          is_public: boolean
          oracle_persona_prompt: string | null
          vitality_score: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['academies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['academies']['Insert']>
      }
      academy_spaces: {
        Row: {
          id: string
          academy_id: string
          parent_space_id: string | null
          name: string
          slug: string
          description: string | null
          icon: string
          color: string
          is_active: boolean
          order_index: number
          source_table: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['academy_spaces']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['academy_spaces']['Insert']>
      }
      corpus_fragments: {
        Row: {
          id: string
          source_file: string
          source_section: string | null
          axis: string[]
          tension: number
          content: string
          keywords: string[]
          weight: number
          academy_id: string | null
          space_id: string | null
          source_type: string | null
          title: string | null
          embedding: number[] | null
          uploaded_by: string | null
          ingested_at: string | null
          embedding_model: string | null
          original_url: string | null
          page_reference: string | null
          upload_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['corpus_fragments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['corpus_fragments']['Insert']>
      }
      saved_dialogues: {
        Row: {
          id: string
          user_id: string
          academy_id: string | null
          space_id: string | null
          title: string | null
          research_topic: string | null
          tutor_system_prompt: string | null
          tutor_model: string | null
          total_messages: number
          total_sources_used: number
          user_notes: string | null
          is_bookmarked: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['saved_dialogues']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['saved_dialogues']['Insert']>
      }
      subjects: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          cover_image_url: string | null
          academy_id: string | null  // FK a academies para scope multi-tenant
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      // ================================================================
      // SAAS HORIZONTAL - TIPOS PARA MODELO POR ESTUDIANTE
      // ================================================================
      
      // Tabla principal del estudiante (tenant individual)
      students: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          locale: string
          timezone: string
          ai_provider: string
          ai_model: string
          ai_temperature: number
          ai_max_tokens: number
          tutor_personality: string
          tutor_custom_prompt: string | null
          created_at: string
          updated_at: string
          last_active_at: string
          is_onboarded: boolean
          is_active: boolean
          settings: Record<string, any>
          plan_type: string
          plan_limits: Record<string, any>
        }
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }
      
      // Asignaturas del estudiante
      student_subjects: {
        Row: {
          id: string
          student_id: string
          name: string
          slug: string
          description: string | null
          icon: string
          color: string
          ai_system_prompt: string | null
          ai_model_override: string | null
          ai_temperature_override: number | null
          created_at: string
          updated_at: string
          is_active: boolean
          is_archived: boolean
          is_pinned: boolean
          order_index: number
          materials_count: number
          dialogues_count: number
          last_used_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['student_subjects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_subjects']['Insert']>
      }
      
      // Materiales del estudiante
      student_materials: {
        Row: {
          id: string
          subject_id: string
          title: string
          description: string | null
          source_type: string
          mime_type: string | null
          content: string | null
          file_url: string | null
          file_size_bytes: number | null
          external_id: string | null
          external_metadata: Record<string, any> | null
          processing_status: string
          processing_error: string | null
          chunks_count: number
          total_tokens: number
          has_embeddings: boolean
          embedding_model: string | null
          embedding_dimension: number | null
          quality_score: number
          is_verified: boolean
          ingested_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          is_deleted: boolean
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['student_materials']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_materials']['Insert']>
      }
      
      // Chunks de materiales para RAG
      student_material_chunks: {
        Row: {
          id: string
          material_id: string
          chunk_index: number
          content: string
          content_hash: string | null
          page_number: number | null
          section_path: string | null
          position_start: number | null
          position_end: number | null
          embedding: number[] | null
          word_count: number | null
          token_count: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_material_chunks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['student_material_chunks']['Insert']>
      }
      
      // Diálogos del estudiante
      student_dialogues: {
        Row: {
          id: string
          student_id: string
          subject_id: string | null
          title: string | null
          auto_title: string | null
          messages: any[]
          sources_used: any[]
          initial_question: string | null
          total_messages: number
          total_user_messages: number
          total_ai_messages: number
          total_tokens: number
          total_sources: number
          avg_response_time_ms: number
          model_used: string | null
          ai_provider: string | null
          thumbs_up: number
          thumbs_down: number
          is_bookmarked: boolean
          is_shared: boolean
          share_token: string | null
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_dialogues']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_dialogues']['Insert']>
      }
      
      // Sesiones de estudio
      study_sessions: {
        Row: {
          id: string
          student_id: string
          subject_id: string | null
          dialogue_id: string | null
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          questions_asked: number
          materials_accessed: any[]
          status: string
          ended_by: string | null
          student_rating: number | null
          student_feedback: string | null
        }
        Insert: Omit<Database['public']['Tables']['study_sessions']['Row'], 'id' | 'started_at'>
        Update: Partial<Database['public']['Tables']['study_sessions']['Insert']>
      }
    }
  }
}

export default supabase
