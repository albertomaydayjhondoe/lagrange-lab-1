import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AcademyRole = 'owner' | 'admin' | 'platon' | 'member' | null;

interface AcademyRoleState {
  role: AcademyRole;
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}

interface UserRoleState {
  isAuthenticated: boolean;
  isPlaton: boolean;
  isAdmin: boolean;
  loading: boolean;
  currentAcademyId: string | null;
  academyRole: AcademyRole;
}

/**
 * Hook for checking user's role in a specific academy
 */
export function useAcademyRole(academyId: string | null): AcademyRoleState {
  const [state, setState] = useState<AcademyRoleState>({
    role: null,
    loading: true,
    isMember: false,
    isAdmin: false,
    isOwner: false,
  });

  useEffect(() => {
    if (!academyId) {
      setState({ role: null, loading: false, isMember: false, isAdmin: false, isOwner: false });
      return;
    }

    const checkAcademyRole = async (userId: string | undefined) => {
      if (!userId) {
        setState({ role: null, loading: false, isMember: false, isAdmin: false, isOwner: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('academy_members')
          .select('role')
          .eq('academy_id', academyId)
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') { // Not found is ok
          console.error('Error fetching academy role:', error);
          setState({ role: null, loading: false, isMember: false, isAdmin: false, isOwner: false });
          return;
        }

        const role = data?.role as AcademyRole || null;
        setState({
          role,
          loading: false,
          isMember: role !== null,
          isAdmin: role === 'admin' || role === 'owner',
          isOwner: role === 'owner',
        });
      } catch (err) {
        console.error('Error checking academy role:', err);
        setState({ role: null, loading: false, isMember: false, isAdmin: false, isOwner: false });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAcademyRole(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      checkAcademyRole(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [academyId]);

  return state;
}

/**
 * Legacy hook for global admin/platon roles
 * Still queries user_roles for backward compatibility
 */
export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    isAuthenticated: false,
    isPlaton: false,
    isAdmin: false,
    loading: true,
    currentAcademyId: null,
    academyRole: null,
  });

  useEffect(() => {
    const checkRoles = async (userId: string | undefined) => {
      if (!userId) {
        setState({ isAuthenticated: false, isPlaton: false, isAdmin: false, loading: false, currentAcademyId: null, academyRole: null });
        return;
      }

      try {
        // Check user_roles for backward compatibility
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching user roles:', error);
        }

        const roleList = roles?.map(r => r.role) || [];
        
        // Also check if user is member of genesis academy
        const { data: genesisMembership } = await supabase
          .from('academy_members')
          .select('role')
          .eq('user_id', userId)
          .eq('academy_id', '00000000-0000-0000-0000-000000000001')
          .single();

        setState({
          isAuthenticated: true,
          isPlaton: roleList.includes('platon') || roleList.includes('admin') || 
                    genesisMembership?.role === 'platon' || genesisMembership?.role === 'owner' || genesisMembership?.role === 'admin',
          isAdmin: roleList.includes('admin') || genesisMembership?.role === 'owner' || genesisMembership?.role === 'admin',
          loading: false,
          currentAcademyId: '00000000-0000-0000-0000-000000000001', // Default to genesis
          academyRole: genesisMembership?.role || null,
        });
      } catch (err) {
        console.error('Error checking roles:', err);
        setState({ isAuthenticated: true, isPlaton: false, isAdmin: false, loading: false, currentAcademyId: null, academyRole: null });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkRoles(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      checkRoles(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

/**
 * Hook to get user's academies
 */
export function useUserAcademies() {
  const [academies, setAcademies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAcademies = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setAcademies([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_academies', {
        p_user_id: session.user.id
      });

      if (error) throw error;
      setAcademies(data || []);
    } catch (err) {
      console.error('Error fetching academies:', err);
      setAcademies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademies();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAcademies();
    });

    return () => subscription.unsubscribe();
  }, [fetchAcademies]);

  return { academies, loading, refetch: fetchAcademies };
}
