/**
 * Supabase React Hooks
 * 
 * Hooks de React para usar Supabase en el frontend.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from './client'
import type { Session, User } from '@supabase/supabase-js'

/**
 * Hook para obtener la sesión actual
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuchar cambios en la sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}

/**
 * Hook para obtener el usuario actual
 */
export function useUser() {
  const { session, loading } = useSession()
  return { user: session?.user ?? null, loading }
}

/**
 * Hook para autenticación
 */
export function useAuth() {
  const { user, loading: userLoading } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
      return { data: null, error }
    }
    
    setLoading(false)
    return { data, error: null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    setLoading(true)
    setError(null)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
      return { data: null, error }
    }
    
    setLoading(false)
    return { data, error: null }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) {
      setError(error.message)
    }
    setLoading(false)
    return { error }
  }, [])

  return {
    user,
    loading: userLoading || loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated: !!user
  }
}

/**
 * Hook para obtener academias
 */
export function useAcademies(publicOnly = false) {
  const [academies, setAcademies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAcademies() {
      setLoading(true)
      
      let query = supabase
        .from('academies')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (publicOnly) {
        query = query.eq('is_public', true)
      }
      
      const { data, error } = await query
      
      if (error) {
        setError(error.message)
      } else {
        setAcademies(data || [])
      }
      
      setLoading(false)
    }
    
    fetchAcademies()
  }, [publicOnly])

  return { academies, loading, error }
}

/**
 * Hook para obtener espacios de una academia
 */
export function useAcademySpaces(academyId: string | undefined) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!academyId) {
      setSpaces([])
      setLoading(false)
      return
    }

    async function fetchSpaces() {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('academy_spaces')
        .select('*')
        .eq('academy_id', academyId)
        .eq('is_active', true)
        .order('order_index')
      
      if (error) {
        setError(error.message)
      } else {
        setSpaces(data || [])
      }
      
      setLoading(false)
    }
    
    fetchSpaces()
  }, [academyId])

  return { spaces, loading, error }
}

/**
 * Hook para diálogos guardados
 */
export function useSavedDialogues() {
  const { user } = useUser()
  const [dialogues, setDialogues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDialogues = useCallback(async () => {
    if (!user) {
      setDialogues([])
      setLoading(false)
      return
    }

    setLoading(true)
    
    const { data, error } = await supabase
      .from('saved_dialogues')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
    
    if (error) {
      setError(error.message)
    } else {
      setDialogues(data || [])
    }
    
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchDialogues()
  }, [fetchDialogues])

  const saveDialogue = useCallback(async (dialogueData: any) => {
    if (!user) return { error: 'Not authenticated' }
    
    const { data, error } = await supabase
      .from('saved_dialogues')
      .insert({
        ...dialogueData,
        user_id: user.id
      })
      .select()
      .single()
    
    if (!error) {
      await fetchDialogues()
    }
    
    return { data, error }
  }, [user, fetchDialogues])

  const deleteDialogue = useCallback(async (dialogueId: string) => {
    const { error } = await supabase
      .from('saved_dialogues')
      .update({ is_deleted: true })
      .eq('id', dialogueId)
    
    if (!error) {
      await fetchDialogues()
    }
    
    return { error }
  }, [fetchDialogues])

  return { dialogues, loading, error, saveDialogue, deleteDialogue, refetch: fetchDialogues }
}
