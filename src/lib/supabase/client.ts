/**
 * Supabase Client Configuration
 * 
 * Configuración del cliente de Supabase para el frontend.
 * Usa variables de entorno de Vercel.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://naikdjreibbugblihgwl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc'

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
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
    }
  }
}

export default supabase
