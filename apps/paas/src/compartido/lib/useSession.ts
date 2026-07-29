import { useState, useEffect, useCallback } from 'react';
import { supabase, getSession, getUser, refreshSession, signOut } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface UseSessionReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Hook for managing Supabase authentication session.
 * Handles session state, refresh, and logout.
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const currentSession = await getSession();
        const currentUser = await getUser();
        setSession(currentSession);
        setUser(currentUser);
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        
        if (newSession) {
          const currentUser = await getUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Refresh session
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { session: newSession } = await refreshSession();
      setSession(newSession);
      if (newSession) {
        const currentUser = await getUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    session,
    user,
    loading,
    isAuthenticated: !!session && !!user,
    refresh,
    logout,
  };
}

export default useSession;
