/**
 * Edge Function: manage-rector
 * 
 * Gestión del rol de Rector con elevación y soberanía.
 * 
 * Operaciones:
 * - GET: Obtener información del rector de una academia
 * - POST: Designar un nuevo rector
 * - PUT: Actualizar datos del rector
 * - DELETE: Desactivar un rector (no lo elimina, lo marca inactivo)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function checkCanManageAcademy(supabase: any, academyId: string, userId: string): Promise<boolean> {
  // Platform admin
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  if (platformAdmin) return true

  // Academy owner
  const { data: academy } = await supabase
    .from('academies')
    .select('owner_user_id')
    .eq('id', academyId)
    .single()
  
  if (academy?.owner_user_id === userId) return true

  // Academy rector
  const { data: rector } = await supabase
    .from('academia_rectors')
    .select('id')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
    .eq('is_current', true)
    .eq('is_active', true)
    .single()
  
  return !!rector
}

// ================================================================
// GET: Obtener rector de una academia
// ================================================================
async function handleGet(supabase: any, academyId: string, _userId: string) {
  // Cualquier miembro puede ver quién es el rector
  const { data, error } = await supabase
    .from('academia_rectors')
    .select(`
      id,
      title,
      appointed_at,
      decree_number,
      institution_oath,
      is_active,
      created_at,
      profiles!academia_rectors_user_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      academies!academia_rectors_academy_id_fkey (
        id,
        name,
        slug
      )
    `)
    .eq('academy_id', academyId)
    .eq('is_current', true)
    .single()

  if (error) {
    return { status: 404, body: { error: 'No se encontró rector para esta academia' } }
  }

  return { status: 200, body: data }
}

// ================================================================
// POST: Designar nuevo rector
// ================================================================
async function handlePost(supabase: any, _supabaseUrl: string, body: any, userId: string) {
  const { academy_id, user_id, title, decree_number, institution_oath } = body

  if (!academy_id || !user_id) {
    return { status: 400, body: { error: 'academy_id y user_id son requeridos' } }
  }

  // Verificar que quien designa tiene autoridad
  const canManage = await checkCanManageAcademy(supabase, academy_id, userId)
  if (!canManage) {
    return { status: 403, body: { error: 'No tienes autoridad para designar un rector en esta academia' } }
  }

  // Verificar que el usuario a designar es miembro
  const { data: memberData } = await supabase
    .from('academy_members')
    .select('role')
    .eq('academy_id', academy_id)
    .eq('user_id', user_id)
    .single()

  if (!memberData) {
    return { status: 400, body: { error: 'El usuario a designar debe ser miembro de la academia' } }
  }

  // Obtener perfil del usuario назначенный
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user_id)
    .single()

  // Llamar a la función de base de datos para asignar rector
  const { data, error } = await supabase
    .rpc('assign_rector', {
      p_academy_id: academy_id,
      p_user_id: user_id,
      p_title: title || 'Rector',
      p_decree_number: decree_number,
      p_institution_oath: institution_oath,
      p_appointed_by: userId
    })

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { 
    status: 201, 
    body: { 
      success: true,
      rector_id: data,
      message: `${profileData?.full_name || 'Usuario'} ha sido designado como ${title || 'Rector'}`
    } 
  }
}

// ================================================================
// PUT: Actualizar rector
// ================================================================
async function handlePut(supabase: any, body: any, userId: string) {
  const { rector_id, title, decree_number, institution_oath, is_active } = body

  if (!rector_id) {
    return { status: 400, body: { error: 'rector_id es requerido' } }
  }

  // Obtener info del rector actual
  const { data: currentRector } = await supabase
    .from('academia_rectors')
    .select('academy_id, user_id')
    .eq('id', rector_id)
    .single()

  if (!currentRector) {
    return { status: 404, body: { error: 'Rector no encontrado' } }
  }

  // Verificar permisos
  const canManage = await checkCanManageAcademy(supabase, currentRector.academy_id, userId)
  if (!canManage) {
    return { status: 403, body: { error: 'No tienes autoridad para actualizar este rector' } }
  }

  // Actualizar
  const updates: any = { updated_at: new Date().toISOString() }
  if (title) updates.title = title
  if (decree_number !== undefined) updates.decree_number = decree_number
  if (institution_oath !== undefined) updates.institution_oath = institution_oath
  if (is_active !== undefined) updates.is_active = is_active

  const { data, error } = await supabase
    .from('academia_rectors')
    .update(updates)
    .eq('id', rector_id)
    .select()
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: { success: true, data } }
}

// ================================================================
// DELETE: Desactivar rector
// ================================================================
async function handleDelete(supabase: any, rectorId: string, userId: string) {
  // Obtener info del rector
  const { data: currentRector } = await supabase
    .from('academia_rectors')
    .select('academy_id')
    .eq('id', rectorId)
    .single()

  if (!currentRector) {
    return { status: 404, body: { error: 'Rector no encontrado' } }
  }

  // Verificar permisos (solo owner o platform admin pueden remover rectores)
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', userId)
    .single()

  const { data: academy } = await supabase
    .from('academies')
    .select('owner_user_id')
    .eq('id', currentRector.academy_id)
    .single()

  const canDelete = platformAdmin || academy?.owner_user_id === userId

  if (!canDelete) {
    return { status: 403, body: { error: 'Solo el owner de la academia o un platform admin pueden remover un rector' } }
  }

  // Desactivar en lugar de eliminar (preservar historia)
  const { error } = await supabase
    .from('academia_rectors')
    .update({ is_current: false, is_active: false, updated_at: new Date().toISOString() })
    .eq('id', rectorId)

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: { success: true, message: 'Rector desactivado correctamente' } }
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
    
    // Extraer academy_id de la URL si existe
    const academyIdFromUrl = pathParts[pathParts.length - 1]
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(academyIdFromUrl)
    const academyId = isUuid ? academyIdFromUrl : null

    let body: any = {}
    if (req.method !== 'GET') {
      body = await req.json()
    }

    let result: any

    switch (req.method) {
      case 'GET':
        if (academyId) {
          result = await handleGet(supabase, academyId, user.id)
        } else {
          // Listar academias donde el usuario es rector
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
            result = { status: 500, body: { error: error.message } }
          } else {
            result = { status: 200, body: data }
          }
        }
        break
      
      case 'POST':
        result = await handlePost(supabase, supabaseUrl, body, user.id)
        break
      
      case 'PUT':
        result = await handlePut(supabase, body, user.id)
        break
      
      case 'DELETE':
        const rectorId = body.rector_id || url.searchParams.get('rector_id')
        result = await handleDelete(supabase, rectorId, user.id)
        break
      
      default:
        result = { status: 405, body: { error: 'Método no permitido' } }
    }

    return new Response(
      JSON.stringify(result.body),
      { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
