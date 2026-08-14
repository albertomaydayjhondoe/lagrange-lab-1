/**
 * Edge Function: manage-subject
 * 
 * CRUD completo para asignaturas de estudiantes.
 * 
 * Operaciones:
 * - GET: Listar asignaturas / Obtener una asignatura
 * - POST: Crear nueva asignatura
 * - PUT: Actualizar asignatura
 * - DELETE: Archivar/Eliminar asignatura
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================================================================
// TYPES
// ================================================================

interface SubjectRequest {
  studentId?: string
  name: string
  description?: string
  icon?: string
  color?: string
  aiSystemPrompt?: string
  aiModelOverride?: string
  aiTemperatureOverride?: number
  orderIndex?: number
}

interface SubjectResponse {
  id: string
  student_id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  ai_system_prompt: string | null
  ai_model_override: string | null
  ai_temperature_override: number | null
  is_active: boolean
  is_archived: boolean
  is_pinned: boolean
  order_index: number
  materials_count: number
  dialogues_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

// ================================================================
// HELPERS
// ================================================================

function getSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey)
}

async function verifyAuth(supabaseUrl: string, supabaseKey: string, authorization: string) {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey)
  
  if (!authorization) {
    return { error: 'No authorization header', user: null }
  }

  const token = authorization.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { error: 'Invalid token', user: null }
  }

  return { user, error: null }
}

// Crear slug desde nombre
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

// Verificar y crear slug único
async function ensureUniqueSlug(supabase: any, studentId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  let counter = 1
  
  while (true) {
    const { data } = await supabase
      .from('student_subjects')
      .select('id')
      .eq('student_id', studentId)
      .eq('slug', slug)
      .maybeSingle()
    
    if (!data || (excludeId && data.id === excludeId)) {
      return slug
    }
    
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

// Verificar límites del plan
async function checkSubjectLimit(supabase: any, studentId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const { data: student } = await supabase
    .from('students')
    .select('plan_limits')
    .eq('id', studentId)
    .single()

  const maxSubjects = student?.plan_limits?.max_subjects || 3

  const { count } = await supabase
    .from('student_subjects')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('is_active', true)

  const current = count || 0

  return {
    allowed: current < maxSubjects,
    current,
    max: maxSubjects
  }
}

// ================================================================
// GET: Listar u obtener asignaturas
// ================================================================
async function handleGet(supabase: any, studentId: string, subjectId?: string) {
  if (subjectId) {
    // Obtener una asignatura específica
    const { data, error } = await supabase
      .from('student_subjects')
      .select('*')
      .eq('id', subjectId)
      .eq('student_id', studentId)
      .single()

    if (error || !data) {
      return { status: 404, body: { error: 'Asignatura no encontrada' } }
    }

    return { status: 200, body: data }
  }

  // Listar todas las asignaturas del estudiante
  const { data, error } = await supabase
    .from('student_subjects')
    .select('*')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: data || [] }
}

// ================================================================
// POST: Crear nueva asignatura
// ================================================================
async function handlePost(supabase: any, studentId: string, body: SubjectRequest) {
  const { name, description, icon, color, aiSystemPrompt, aiModelOverride, aiTemperatureOverride, orderIndex } = body

  if (!name || name.trim().length === 0) {
    return { status: 400, body: { error: 'El nombre es requerido' } }
  }

  // Verificar límites del plan
  const limitCheck = await checkSubjectLimit(supabase, studentId)
  if (!limitCheck.allowed) {
    return { 
      status: 403, 
      body: { 
        error: `Límite de asignaturas alcanzado (${limitCheck.current}/${limitCheck.max})`,
        upgrade_url: '/settings/subscription'
      } 
    }
  }

  // Crear slug único
  const baseSlug = createSlug(name)
  const slug = await ensureUniqueSlug(supabase, studentId, baseSlug)

  // Obtener el siguiente order_index
  const { data: lastSubject } = await supabase
    .from('student_subjects')
    .select('order_index')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = orderIndex ?? ((lastSubject?.order_index ?? -1) + 1)

  // Crear asignatura
  const { data, error } = await supabase
    .from('student_subjects')
    .insert({
      student_id: studentId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      icon: icon || '📚',
      color: color || '#6366f1',
      ai_system_prompt: aiSystemPrompt || null,
      ai_model_override: aiModelOverride || null,
      ai_temperature_override: aiTemperatureOverride || null,
      order_index: nextOrder,
      is_active: true,
      is_archived: false
    })
    .select()
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 201, body: data }
}

// ================================================================
// PUT: Actualizar asignatura
// ================================================================
async function handlePut(supabase: any, studentId: string, subjectId: string, body: Partial<SubjectRequest>) {
  // Verificar que la asignatura existe y pertenece al estudiante
  const { data: existing } = await supabase
    .from('student_subjects')
    .select('id')
    .eq('id', subjectId)
    .eq('student_id', studentId)
    .single()

  if (!existing) {
    return { status: 404, body: { error: 'Asignatura no encontrada' } }
  }

  // Preparar actualizaciones
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined) {
    updates.name = body.name.trim()
    // Actualizar slug si cambia el nombre
    const baseSlug = createSlug(body.name)
    updates.slug = await ensureUniqueSlug(supabase, studentId, baseSlug, subjectId)
  }

  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.color !== undefined) updates.color = body.color
  if (body.aiSystemPrompt !== undefined) updates.ai_system_prompt = body.aiSystemPrompt || null
  if (body.aiModelOverride !== undefined) updates.ai_model_override = body.aiModelOverride || null
  if (body.aiTemperatureOverride !== undefined) updates.ai_temperature_override = body.aiTemperatureOverride
  if (body.orderIndex !== undefined) updates.order_index = body.orderIndex

  // Actualizar
  const { data, error } = await supabase
    .from('student_subjects')
    .update(updates)
    .eq('id', subjectId)
    .select()
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: data }
}

// ================================================================
// PATCH: Acciones específicas
// ================================================================
async function handlePatch(supabase: any, studentId: string, subjectId: string, action: string) {
  // Verificar que la asignatura existe y pertenece al estudiante
  const { data: existing } = await supabase
    .from('student_subjects')
    .select('id')
    .eq('id', subjectId)
    .eq('student_id', studentId)
    .single()

  if (!existing) {
    return { status: 404, body: { error: 'Asignatura no encontrada' } }
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  let message = ''

  switch (action) {
    case 'archive':
      updates.is_archived = true
      updates.is_active = false
      message = 'Asignatura archivada'
      break
    
    case 'unarchive':
      updates.is_archived = false
      updates.is_active = true
      message = 'Asignatura restaurada'
      break
    
    case 'pin':
      updates.is_pinned = true
      message = 'Asignatura fijada'
      break
    
    case 'unpin':
      updates.is_pinned = false
      message = 'Asignatura des-fijada'
      break
    
    case 'reset_usage':
      updates.last_used_at = null
      message = 'Historial de uso reseteado'
      break
    
    default:
      return { status: 400, body: { error: `Acción desconocida: ${action}` } }
  }

  const { data, error } = await supabase
    .from('student_subjects')
    .update(updates)
    .eq('id', subjectId)
    .select()
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: { ...data, message } }
}

// ================================================================
// DELETE: Eliminar asignatura (soft delete)
// ================================================================
async function handleDelete(supabase: any, studentId: string, subjectId: string, hard: boolean = false) {
  // Verificar que la asignatura existe y pertenece al estudiante
  const { data: existing } = await supabase
    .from('student_subjects')
    .select('id, name')
    .eq('id', subjectId)
    .eq('student_id', studentId)
    .single()

  if (!existing) {
    return { status: 404, body: { error: 'Asignatura no encontrada' } }
  }

  if (hard) {
    // Eliminación hard: eliminar materiales y chunks también
    // Primero obtener todos los materiales
    const { data: materials } = await supabase
      .from('student_materials')
      .select('id')
      .eq('subject_id', subjectId)

    // Eliminar chunks de cada material
    if (materials && materials.length > 0) {
      for (const mat of materials) {
        await supabase
          .from('student_material_chunks')
          .delete()
          .eq('material_id', mat.id)
      }
      
      // Eliminar materiales
      await supabase
        .from('student_materials')
        .delete()
        .eq('subject_id', subjectId)
    }

    // Eliminar asignatura
    await supabase
      .from('student_subjects')
      .delete()
      .eq('id', subjectId)

    return { status: 200, body: { success: true, message: `Asignatura "${existing.name}" eliminada permanentemente` } }
  }

  // Eliminación soft: archivar
  const { error } = await supabase
    .from('student_subjects')
    .update({ 
      is_archived: true, 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', subjectId)

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: { success: true, message: `Asignatura "${existing.name}" archivada` } }
}

// ================================================================
// REORDER: Reordenar asignaturas
// ================================================================
async function handleReorder(supabase: any, studentId: string, subjectOrders: { id: string; order_index: number }[]) {
  // Actualizar orden de cada asignatura
  const updates = subjectOrders.map(({ id, order_index }) =>
    supabase
      .from('student_subjects')
      .update({ order_index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', studentId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    return { status: 500, body: { error: 'Error al reordenar algunas asignaturas' } }
  }

  return { status: 200, body: { success: true, message: 'Asignaturas reordenadas' } }
}

// ================================================================
// MAIN HANDLER
// ================================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    const { user, error: authError } = await verifyAuth(supabaseUrl, supabaseServiceKey, authHeader!)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getSupabaseClient(supabaseUrl, supabaseServiceKey)
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Extraer IDs de la URL
    // /functions/v1/manage-subject/{subjectId}
    const subjectIdFromUrl = pathParts[pathParts.length - 1]
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subjectIdFromUrl)
    const subjectId = isUuid ? subjectIdFromUrl : null

    // Obtener o crear estudiante
    const { data: studentData } = await supabase.rpc(
      'get_or_create_student',
      { p_user_id: user.id }
    )

    if (!studentData) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener perfil de estudiante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const studentId = studentData

    let body: any = {}
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      body = await req.json()
    }

    let result: any

    switch (req.method) {
      case 'GET':
        // ¿Listar archivadas?
        const showArchived = url.searchParams.get('archived') === 'true'
        
        if (showArchived) {
          const { data, error } = await supabase
            .from('student_subjects')
            .select('*')
            .eq('student_id', studentId)
            .eq('is_archived', true)
            .order('updated_at', { ascending: false })
          
          result = error 
            ? { status: 500, body: { error: error.message } }
            : { status: 200, body: data || [] }
        } else {
          result = await handleGet(supabase, studentId, subjectId || undefined)
        }
        break
      
      case 'POST':
        if (url.searchParams.get('action') === 'reorder') {
          // Reordenar asignaturas
          const orders = await req.json()
          result = await handleReorder(supabase, studentId, orders)
        } else {
          result = await handlePost(supabase, studentId, body)
        }
        break
      
      case 'PUT':
        if (!subjectId) {
          result = { status: 400, body: { error: 'subjectId es requerido' } }
        } else {
          result = await handlePut(supabase, studentId, subjectId, body)
        }
        break
      
      case 'PATCH':
        if (!subjectId) {
          result = { status: 400, body: { error: 'subjectId es requerido' } }
        } else {
          const action = url.searchParams.get('action') || body.action
          result = await handlePatch(supabase, studentId, subjectId, action)
        }
        break
      
      case 'DELETE':
        if (!subjectId) {
          result = { status: 400, body: { error: 'subjectId es requerido' } }
        } else {
          const hard = url.searchParams.get('hard') === 'true'
          result = await handleDelete(supabase, studentId, subjectId, hard)
        }
        break
      
      default:
        result = { status: 405, body: { error: 'Método no permitido' } }
    }

    return new Response(
      JSON.stringify(result.body),
      { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manage-subject:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
