/**
 * Supabase React Hooks
 * 
 * Hooks de React para usar Supabase en el frontend.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from './client'
import type { Session, User } from '@supabase/supabase-js'
import { SUPABASE_URL } from '../env'

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

/**
 * Hook para verificar si el usuario es rector de una academia
 */
export function useIsRector(academyId: string | undefined) {
  const { user } = useUser()
  const [isRector, setIsRector] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !academyId) {
      setIsRector(false)
      setLoading(false)
      return
    }

    async function checkRectorStatus() {
      setLoading(true)
      
      const { data, error } = await supabase
        .rpc('user_is_academy_rector', { p_academy_id: academyId })
      
      if (!error && data) {
        setIsRector(true)
      } else {
        setIsRector(false)
      }
      
      setLoading(false)
    }

    checkRectorStatus()
  }, [user, academyId])

  return { isRector, loading }
}

/**
 * Hook para obtener información del rector de una academia
 */
export function useAcademyRector(academyId: string | undefined) {
  const [rector, setRector] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!academyId) {
      setRector(null)
      setLoading(false)
      return
    }

    async function fetchRector() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('academia_rectors')
        .select(`
          id,
          title,
          appointed_at,
          decree_number,
          institution_oath,
          profiles!academia_rectors_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('academy_id', academyId)
        .eq('is_current', true)
        .single()

      if (error) {
        setError(error.message)
        setRector(null)
      } else {
        setRector(data)
      }

      setLoading(false)
    }

    fetchRector()
  }, [academyId])

  return { rector, loading, error }
}

/**
 * Hook para obtener las academias donde el usuario es rector
 */
export function useRectorAcademies() {
  const { user } = useUser()
  const [academies, setAcademies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setAcademies([])
      setLoading(false)
      return
    }

    async function fetchRectorAcademies() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('academia_rectors')
        .select(`
          id,
          title,
          appointed_at,
          academies!academia_rectors_academy_id_fkey (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id)
        .eq('is_current', true)
        .eq('is_active', true)

      if (error) {
        setError(error.message)
        setAcademies([])
      } else {
        setAcademies(data || [])
      }

      setLoading(false)
    }

    fetchRectorAcademies()
  }, [user])

  return { academies, loading, error }
}

/**
 * Hook para verificar si el usuario puede gestionar una academia (owner/rector/platform_admin)
 */
export function useCanManageAcademy(academyId: string | undefined) {
  const { user } = useUser()
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !academyId) {
      setCanManage(false)
      setLoading(false)
      return
    }

    async function checkManageStatus() {
      setLoading(true)
      
      const { data, error } = await supabase
        .rpc('user_can_manage_academy', { p_academy_id: academyId })
      
      if (!error && data) {
        setCanManage(true)
      } else {
        setCanManage(false)
      }
      
      setLoading(false)
    }

    checkManageStatus()
  }, [user, academyId])

  return { canManage, loading }
}

// ================================================================
// SAAS HORIZONTAL - HOOKS POR ESTUDIANTE
// ================================================================

/**
 * Hook para obtener/crear el perfil de estudiante del usuario
 */
export function useStudent() {
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setStudent(null)
      setLoading(false)
      return
    }

    async function fetchStudent() {
      setLoading(true)
      setError(null)

      try {
        // Usar RPC para obtener o crear estudiante
        const { data, error } = await supabase.rpc('get_or_create_student', {
          p_user_id: user.id
        })

        if (error) throw error

        // Obtener datos completos del estudiante
        if (data) {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('id', data)
            .single()

          if (studentError) throw studentError
          setStudent(studentData)
        }
      } catch (e: any) {
        setError(e.message)
      }

      setLoading(false)
    }

    fetchStudent()
  }, [user])

  return { student, loading, error }
}

/**
 * Hook para obtener las asignaturas del estudiante
 */
export function useStudentSubjects() {
  const { student } = useStudent()
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!student) {
      setSubjects([])
      setLoading(false)
      return
    }

    async function fetchSubjects() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', student.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setSubjects(data || [])
      }

      setLoading(false)
    }

    fetchSubjects()
  }, [student])

  const createSubject = useCallback(async (subjectData: {
    name: string
    description?: string
    icon?: string
    color?: string
  }) => {
    if (!student) return { error: 'No student' }

    const { data, error } = await supabase.rpc('manage_subject_create', {
      p_student_id: student.id,
      p_name: subjectData.name,
      p_description: subjectData.description,
      p_icon: subjectData.icon,
      p_color: subjectData.color
    })

    if (!error) {
      // Refrescar lista
      const { data: refreshed } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', student.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
      setSubjects(refreshed || [])
    }

    return { data, error }
  }, [student, supabase])

  return { subjects, loading, error, createSubject, refetch: () => {
    if (student) {
      supabase.from('student_subjects')
        .select('*')
        .eq('student_id', student.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .then(({ data }) => setSubjects(data || []))
    }
  }}
}

/**
 * Hook para obtener materiales de una asignatura
 */
export function useSubjectMaterials(subjectId: string | undefined) {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!subjectId) {
      setMaterials([])
      setLoading(false)
      return
    }

    async function fetchMaterials() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('student_materials')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setMaterials(data || [])
      }

      setLoading(false)
    }

    fetchMaterials()
  }, [subjectId])

  return { materials, loading, error }
}

/**
 * Hook para diálogos del estudiante
 */
export function useStudentDialogues(studentId: string | undefined) {
  const [dialogues, setDialogues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) {
      setDialogues([])
      setLoading(false)
      return
    }

    async function fetchDialogues() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('student_dialogues')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_deleted', false)
        .order('last_message_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setDialogues(data || [])
      }

      setLoading(false)
    }

    fetchDialogues()
  }, [studentId])

  return { dialogues, loading, error }
}

/**
 * Cliente API para Edge Functions del modelo SaaS
 */
export const studentApi = {
  /**
   * Hacer una pregunta al oráculo del estudiante
   */
  async askOracle(params: {
    studentId?: string
    subjectId?: string
    question: string
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  }) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/student-oracle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get response')
    }

    return response.json()
  },

  /**
   * Ingerir un material nuevo
   */
  async ingestMaterial(params: {
    subjectId: string
    title: string
    sourceType: string
    content?: string
    fileData?: string
    fileUrl?: string
    description?: string
  }) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-material`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to ingest material')
    }

    return response.json()
  },

  /**
   * Gestionar asignaturas
   */
  async manageSubject(method: 'GET' | 'POST' | 'PUT' | 'DELETE', params?: any) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    let url = `${SUPABASE_URL}/functions/v1/manage-subject`
    if (params?.id) {
      url += `/${params.id}`
      delete params.id
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: method !== 'GET' ? JSON.stringify(params) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to manage subject')
    }

    return response.json()
  }
}
