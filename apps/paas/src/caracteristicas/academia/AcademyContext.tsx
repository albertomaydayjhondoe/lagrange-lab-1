import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';

export type AcademyRole = 'owner' | 'admin' | 'platon' | 'member' | null;

/** Tema visual de una academia - extraído de oracle_persona_prompt */
export interface AcademyTheme {
  primaryColor: string;      // Color principal de acento
  secondaryColor: string;    // Color secundario
  backgroundColor: string;   // Color de fondo
  textColor: string;         // Color de texto principal
  mutedColor: string;        // Color de texto secundario
  borderColor: string;       // Color de bordes
  gradientStart: string;     // Inicio del gradiente
  gradientEnd: string;       // Fin del gradiente
  glowColor: string;         // Color de efecto glow
}

/** Academia completa con información de tema */
export interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
  oracle_persona_prompt?: string; // Para extraer tema visual
  persona_name?: string;          // Nombre del oráculo
}

/** Paleta por defecto - Tema genesis */
const DEFAULT_THEME: AcademyTheme = {
  primaryColor: '#8B5CF6',      // Violeta
  secondaryColor: '#A78BFA',    // Violeta claro
  backgroundColor: '#0F0F23',   // Azul muy oscuro
  textColor: '#E2E8F0',         // Gris claro
  mutedColor: '#94A3B8',        // Gris medio
  borderColor: '#1E293B',       // Borde oscuro
  gradientStart: '#1E1B4B',     // Indigo oscuro
  gradientEnd: '#0F172A',       // Slate muy oscuro
  glowColor: 'rgba(139, 92, 246, 0.3)', // Glow violeta
};

/**
 * Extrae colores de un texto de prompt de oráculo.
 * Busca patrones como "color:#XXXXXX" o nombres de colores CSS.
 */
function extractThemeFromPrompt(prompt: string | undefined): AcademyTheme {
  if (!prompt) return DEFAULT_THEME;

  // Buscar hex colors
  const hexMatch = prompt.match(/#[0-9A-Fa-f]{6}/g) || [];
  
  // Paleta alternativa si hay colores personalizados
  if (hexMatch.length >= 3) {
    return {
      primaryColor: hexMatch[0],
      secondaryColor: hexMatch[1],
      backgroundColor: '#0F0F23',
      textColor: '#E2E8F0',
      mutedColor: '#94A3B8',
      borderColor: '#1E293B',
      gradientStart: adjustBrightness(hexMatch[0], -30),
      gradientEnd: '#0F172A',
      glowColor: hexToRgba(hexMatch[0], 0.3),
    };
  }

  // Detectar tono general del prompt
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('rojo') || lowerPrompt.includes('rojo') || lowerPrompt.includes('fire') || lowerPrompt.includes('passion')) {
    return {
      primaryColor: '#EF4444',
      secondaryColor: '#F87171',
      backgroundColor: '#0F0F23',
      textColor: '#E2E8F0',
      mutedColor: '#94A3B8',
      borderColor: '#1E293B',
      gradientStart: '#450A0A',
      gradientEnd: '#0F172A',
      glowColor: 'rgba(239, 68, 68, 0.3)',
    };
  }
  
  if (lowerPrompt.includes('azul') || lowerPrompt.includes('blue') || lowerPrompt.includes('ocean') || lowerPrompt.includes('sabiduría')) {
    return {
      primaryColor: '#3B82F6',
      secondaryColor: '#60A5FA',
      backgroundColor: '#0F0F23',
      textColor: '#E2E8F0',
      mutedColor: '#94A3B8',
      borderColor: '#1E293B',
      gradientStart: '#172554',
      gradientEnd: '#0F172A',
      glowColor: 'rgba(59, 130, 246, 0.3)',
    };
  }
  
  if (lowerPrompt.includes('verde') || lowerPrompt.includes('green') || lowerPrompt.includes('nature') || lowerPrompt.includes('crecimiento')) {
    return {
      primaryColor: '#22C55E',
      secondaryColor: '#4ADE80',
      backgroundColor: '#0F0F23',
      textColor: '#E2E8F0',
      mutedColor: '#94A3B8',
      borderColor: '#1E293B',
      gradientStart: '#052E16',
      gradientEnd: '#0F172A',
      glowColor: 'rgba(34, 197, 94, 0.3)',
    };
  }
  
  if (lowerPrompt.includes('oro') || lowerPrompt.includes('gold') || lowerPrompt.includes('rey') || lowerPrompt.includes('prosperity')) {
    return {
      primaryColor: '#F59E0B',
      secondaryColor: '#FBBF24',
      backgroundColor: '#0F0F23',
      textColor: '#E2E8F0',
      mutedColor: '#94A3B8',
      borderColor: '#1E293B',
      gradientStart: '#451A03',
      gradientEnd: '#0F172A',
      glowColor: 'rgba(245, 158, 11, 0.3)',
    };
  }

  // Default violeta
  return DEFAULT_THEME;
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface AcademyContextState {
  academy: Academy | null;
  academyId: string | null;
  role: AcademyRole;
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isPlaton: boolean;
  theme: AcademyTheme;
}

interface AcademyContextValue extends AcademyContextState {
  setAcademyBySlug: (slug: string) => Promise<void>;
  refreshAcademy: () => Promise<void>;
}

const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';
const GENESIS_SLUG = 'genesis';

const AcademyContext = createContext<AcademyContextValue | null>(null);

export function AcademyProvider({ children, initialSlug }: { children: ReactNode; initialSlug?: string }) {
  const [state, setState] = useState<AcademyContextState>({
    academy: null,
    academyId: null,
    role: null,
    loading: true,
    isMember: false,
    isAdmin: false,
    isOwner: false,
    isPlaton: false,
    theme: DEFAULT_THEME,
  });

  const fetchAcademyAndRole = useCallback(async (slug: string) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // First resolve the academy by slug
      const { data: academyData, error: academyError } = await supabase
        .from('academies')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (academyError) {
        console.error('Error fetching academy:', academyError);
        // Fallback to genesis
        const { data: genesisData } = await supabase
          .from('academies')
          .select('*')
          .eq('slug', GENESIS_SLUG)
          .maybeSingle();

        if (genesisData) {
          setState({
            academy: genesisData,
            academyId: genesisData.id,
            role: null,
            loading: false,
            isMember: false,
            isAdmin: false,
            isOwner: false,
            isPlaton: false,
            theme: extractThemeFromPrompt(genesisData.oracle_persona_prompt),
          });
        }
        return;
      }

      if (!academyData) {
        // Academy not found, try genesis
        const { data: genesisData } = await supabase
          .from('academies')
          .select('*')
          .eq('slug', GENESIS_SLUG)
          .maybeSingle();

        if (genesisData) {
          setState({
            academy: genesisData,
            academyId: genesisData.id,
            role: null,
            loading: false,
            isMember: false,
            isAdmin: false,
            isOwner: false,
            isPlaton: false,
            theme: extractThemeFromPrompt(genesisData.oracle_persona_prompt),
          });
        }
        return;
      }

      // Now check user's role in this academy
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      let role: AcademyRole = null;
      let isMember = false;
      let isAdmin = false;
      let isOwner = false;
      let isPlaton = false;

      if (userId) {
        const { data: membership } = await supabase
          .from('academy_members')
          .select('role')
          .eq('academy_id', academyData.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (membership) {
          role = membership.role as AcademyRole;
          isMember = role !== null;
          isAdmin = role === 'admin' || role === 'owner';
          isOwner = role === 'owner';
          isPlaton = role === 'platon';
        }

        // Also check global roles for platon/admin status
        if (!isPlaton && !isAdmin) {
          const { data: globalRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

          const roleList = globalRoles?.map(r => r.role) || [];
          isPlaton = roleList.includes('platon');
          isAdmin = isAdmin || roleList.includes('admin');
        }
      }

      setState({
        academy: academyData,
        academyId: academyData.id,
        role,
        loading: false,
        isMember,
        isAdmin,
        isOwner,
        isPlaton,
        theme: extractThemeFromPrompt(academyData.oracle_persona_prompt),
      });

      // Store current academy in localStorage
      localStorage.setItem('currentAcademyId', academyData.id);
      localStorage.setItem('currentAcademySlug', slug);

    } catch (error) {
      console.error('Error in AcademyProvider:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Initialize with slug from URL or localStorage
  useEffect(() => {
    const slug = initialSlug || localStorage.getItem('currentAcademySlug') || GENESIS_SLUG;
    fetchAcademyAndRole(slug);
  }, [initialSlug, fetchAcademyAndRole]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Re-fetch academy and role when auth state changes
      const slug = localStorage.getItem('currentAcademySlug') || GENESIS_SLUG;
      fetchAcademyAndRole(slug);
    });

    return () => subscription.unsubscribe();
  }, [fetchAcademyAndRole]);

  const value: AcademyContextValue = {
    ...state,
    setAcademyBySlug: fetchAcademyAndRole,
    refreshAcademy: () => {
      const slug = localStorage.getItem('currentAcademySlug') || GENESIS_SLUG;
      return fetchAcademyAndRole(slug);
    },
  };

  return (
    <AcademyContext.Provider value={value}>
      {children}
    </AcademyContext.Provider>
  );
}

/**
 * Hook to access academy context
 * All components should use this instead of accessing academyId directly
 */
export function useAcademy(): AcademyContextValue {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
}

/**
 * Hook to get just the academyId - for cases where you only need the ID
 */
export function useAcademyId(): string | null {
  const { academyId } = useAcademy();
  return academyId;
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useAcademy() instead
 */
export function useAcademyRole(academyId: string | null): AcademyContextState {
  const { role, loading, isMember, isAdmin, isOwner } = useAcademy();
  return {
    academy: null,
    academyId,
    role,
    loading,
    isMember,
    isAdmin,
    isOwner,
    isPlaton: false,
    theme: DEFAULT_THEME,
  };
}

/**
 * Hook to access the theme of the current academy
 * Returns default theme if not in AcademyProvider
 */
export function useAcademyTheme(): AcademyTheme {
  const context = useContext(AcademyContext);
  return context?.theme || DEFAULT_THEME;
}
