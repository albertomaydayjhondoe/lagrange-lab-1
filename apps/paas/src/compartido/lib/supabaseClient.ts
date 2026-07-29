// Supabase client configuration with session handling
// Falls back to custom API when VITE_USE_CUSTOM_API=true
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { authApi, setAuthToken, getAuthToken } from '../../lib/apiClient';

// Check if using custom API
const USE_CUSTOM_API = import.meta.env.VITE_USE_CUSTOM_API === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://naikdjreibbugblihgwl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc';

// Validate that URL doesn't have duplicate paths
if (SUPABASE_URL.includes('/rest/v1/')) {
  console.error('❌ VITE_SUPABASE_URL contains duplicate /rest/v1/. Please set it to the base URL only (e.g., https://xxx.supabase.co)');
}

// Browser client with session persistence
// Always use the correct Supabase project (naikdjreibbugblihgwl)
export const supabase: SupabaseClient<Database> = !USE_CUSTOM_API
  ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-client-info': 'lagrange-lab-vite',
        },
      },
    })
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false },
    });

// Check if using Docker/custom API
export const isUsingCustomAPI = USE_CUSTOM_API;

// Type-safe helper for creating supabase clients
export function createSupabaseClient() {
  return supabase;
}

// Get current session (for server-side or when needing synchronous access)
export async function getSession() {
  if (USE_CUSTOM_API) {
    const token = getAuthToken();
    if (token) {
      try {
        const { user } = await authApi.me();
        return { user, email: user.email, access_token: token };
      } catch {
        return null;
      }
    }
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current user
export async function getUser() {
  if (USE_CUSTOM_API) {
    try {
      const { user } = await authApi.me();
      return user;
    } catch {
      return null;
    }
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Refresh the session
export async function refreshSession() {
  if (USE_CUSTOM_API) {
    return { session: null, error: null };
  }
  const { data: { session }, error } = await supabase.auth.refreshSession();
  return { session, error };
}

// Sign out and clear session
export async function signOut() {
  if (USE_CUSTOM_API) {
    setAuthToken(null);
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Register (custom API or Supabase)
export async function register(email: string, password: string) {
  if (USE_CUSTOM_API) {
    const response = await authApi.register(email, password);
    setAuthToken(response.token);
    return { user: response.user, error: null };
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (data?.user) {
    setAuthToken((data as any).session?.access_token);
  }
  return { user: data?.user, error };
}

// Login (custom API or Supabase)
export async function login(email: string, password: string) {
  if (USE_CUSTOM_API) {
    const response = await authApi.login(email, password);
    setAuthToken(response.token);
    return { user: response.user, error: null };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (data?.user) {
    setAuthToken((data as any).session?.access_token);
  }
  return { user: data?.user, error };
}