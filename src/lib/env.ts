/**
 * Environment Configuration
 * Centralized configuration for Supabase and other services.
 * Includes fallbacks to ensure the app works even without env vars configured.
 */

// Supabase Configuration with fallbacks
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://naikdjreibbugblihgwl.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc';
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'naikdjreibbugblihgwl';

// Check if using custom API (Docker mode)
export const USE_CUSTOM_API = import.meta.env.VITE_USE_CUSTOM_API === 'true';

// Validate URL format
if (SUPABASE_URL.includes('/rest/v1/')) {
  console.error('❌ VITE_SUPABASE_URL contains duplicate /rest/v1/. Please set it to the base URL only.');
}
