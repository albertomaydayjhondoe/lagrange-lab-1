import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';

export type AcademyRole = 'owner' | 'admin' | 'platon' | 'member' | null;

export interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
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
  };
}
