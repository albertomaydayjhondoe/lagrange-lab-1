import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'platon' | 'user';

interface UserRoleState {
  isAuthenticated: boolean;
  isPlaton: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    isAuthenticated: false,
    isPlaton: false,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const checkRoles = async (userId: string | undefined) => {
      if (!userId) {
        setState({ isAuthenticated: false, isPlaton: false, isAdmin: false, loading: false });
        return;
      }

      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching user roles:', error);
          setState({ isAuthenticated: true, isPlaton: false, isAdmin: false, loading: false });
          return;
        }

        const roleList = roles?.map(r => r.role as AppRole) || [];
        setState({
          isAuthenticated: true,
          isPlaton: roleList.includes('platon') || roleList.includes('admin'),
          isAdmin: roleList.includes('admin'),
          loading: false,
        });
      } catch (err) {
        console.error('Error checking roles:', err);
        setState({ isAuthenticated: true, isPlaton: false, isAdmin: false, loading: false });
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkRoles(session?.user?.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      checkRoles(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
