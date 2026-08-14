/**
 * Environment Configuration (universally portable)
 * Centralized config for Supabase and other services.
 *
 * UNIVERSALITY: no project ref is hardcoded. The app links against ANY
 * Supabase instance and deploys to ANY Vercel project purely via env vars.
 * If required vars are missing, the app fails loudly (never silently
 * connects to someone else's project).
 */

function requireEnv(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(
      `[Lagrange] Missing required env var ${name}. ` +
        `Copy .env.example to .env and fill in your own Supabase project values.`
    );
  }
  return value;
}

function optionalEnv(name: string, fallback = ''): string {
  return (import.meta.env[name] as string | undefined) ?? fallback;
}

// Supabase Configuration — REQUIRED, no real-project fallbacks
export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL');
export const SUPABASE_PUBLISHABLE_KEY = requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
export const SUPABASE_PROJECT_ID = requireEnv('VITE_SUPABASE_PROJECT_ID');

// Optional flags
export const USE_CUSTOM_API = optionalEnv('VITE_USE_CUSTOM_API') === 'true';

// Validate URL format
if (SUPABASE_URL.includes('/rest/v1/')) {
  console.error('❌ VITE_SUPABASE_URL must be the base URL only (e.g. https://<ref>.supabase.co), not /rest/v1/.');
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_PROJECT_ID);
