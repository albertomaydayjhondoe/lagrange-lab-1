// Supabase client configuration with session handling
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Browser client with session persistence
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // For OAuth callback
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-client-info': 'lagrange-lab-vite',
      },
    },
  }
);

// Type-safe helper for creating supabase clients
export function createSupabaseClient() {
  return supabase;
}

// Get current session (for server-side or when needing synchronous access)
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current user
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Refresh the session
export async function refreshSession() {
  const { data: { session }, error } = await supabase.auth.refreshSession();
  return { session, error };
}

// Sign out and clear session
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}