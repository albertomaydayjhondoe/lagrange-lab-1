/**
 * Edge Function: student-oracle
 * 
 * Motor IA Socrático PRIVADO por estudiante.
 * Cada estudiante tiene su propio contexto RAG extraído de SUS materiales.
 * 
 * Flujo:
 * 1. Verificar autenticación y acceso al estudiante
 * 2. Obtener configuración de IA del estudiante
 * 3. Crear embedding de la pregunta
 * 4. Buscar chunks relevantes en LOS MATERIALES DE ESTE ESTUDIANTE
 * 5. Generar respuesta socrática con el contexto privado
 * 6. Guardar el diálogo
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

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface Source {
  chunk_id: string
  material_id: string
  content: string
  similarity: number
  source_type: string
  title: string
}

interface StudentOracleRequest {
  studentId?: string
  subjectId?: string
  question: string
  conversationHistory?: Message[]
  sessionId?: string
  includeSources?: boolean
}

interface StudentOracleResponse {
  response: string
  student_id: string
  subject_id?: string
  sources: Source[]
  total_sources: number
  model: string
  provider: string
  tokens_used: number
  response_time_ms: number
  session_id: string
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

async function getStudentConfig(supabase: any, studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()
  
  return { data, error }
}

async function createEmbedding(text: string, model: string = 'text-embedding-3-small'): Promise<number[]> {
  const apiKey = Deno.env.get('AI_API_KEY')
  const gatewayUrl = Deno.env.get('AI_GATEWAY_URL') || 'https://api.openai.com/v1'
  
  const response = await fetch(`${gatewayUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: model,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Embedding error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function queryStudentChunks(
  supabase: any,
  studentId: string,
  queryEmbedding: number[],
  subjectId?: string,
  matchCount: number = 10
): Promise<Source[]> {
  const { data, error } = await supabase.rpc('match_student_chunks', {
    p_query_embedding: queryEmbedding,
    p_student_id: studentId,
    p_subject_id: subjectId || null,
    p_match_count: matchCount,
    p_min_similarity: 0.65
  })

  if (error) {
    console.error('Error querying chunks:', error)
    return []
  }

  return data || []
}

async function generateSocraticResponse(
  question: string,
  context: Source[],
  studentConfig: any,
  conversationHistory: Message[] = []
): Promise<{ response: string; tokens_used: number }> {
  const apiKey = Deno.env.get('AI_API_KEY')
  const gatewayUrl = Deno.env.get('AI_GATEWAY_URL') || 'https://api.openai.com/v1'
  const model = studentConfig.ai_model || 'gpt-4o-mini'

  // Construir prompt socrático con contexto del estudiante
  const contextText = context.length > 0
    ? context.map((s, i) => `[Fuente ${i + 1}] ${s.title} (${s.source_type}):\n${s.content}\n`).join('\n---\n')
    : 'NO HAY MATERIAL RELACIONADO EN TUS APUNTES.'

  // Prompt del sistema basado en la personalidad del tutor
  const tutorPrompts: Record<string, string> = {
    socratic: `Eres un tutor socrático que guía al estudiante mediante preguntas que despiertan el pensamiento crítico.
NUNCA des respuestas directas. Siempre responde con PREGUNTAS que hagan reflexionar.
Si no tienes contexto relevante, sé honesto pero guía al estudiante a buscar por su cuenta.
Tu objetivo es la comprensión profunda, no la memorización.`,
    
    didactic: `Eres un tutor didáctico que explica conceptos de manera clara y estructurada.
Usa analogías y ejemplos para hacer los temas comprensibles.
Estructura tus respuestas con títulos, listas y pasos claros.
Tu objetivo es que el estudiante entienda perfectamente el tema.`,
    
    shein: `Eres un asistente conciso que va directo al punto.
Respuestas cortas, claras y útiles.
No hay rodeos ni explicaciones innecesarias.
Tu objetivo es resolver la duda rápidamente.`,
    
    custom: studentConfig.tutor_custom_prompt || `Eres un tutor personalizado que ayuda al estudiante.`
  }

  const systemPrompt = tutorPrompts[studentConfig.tutor_personality || 'socratic']

  // Construir mensajes
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `CONTEXTO DE MIS MATERIALES:\n${contextText}\n\n---\n\nMI PREGUNTA: ${question}` }
  ]

  // Agregar historial de conversación si existe
  if (conversationHistory.length > 0) {
    messages[1] = { role: 'system', content: 'HISTORIAL DE CONVERSACIÓN ANTERIOR:' }
    conversationHistory.forEach(msg => {
      messages.push(msg)
    })
    messages.push({ role: 'user', content: `CONTEXTO DE MIS MATERIALES:\n${contextText}\n\n---\n\nMI NUEVA PREGUNTA: ${question}` })
  }

  const response = await fetch(`${gatewayUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: studentConfig.ai_temperature || 0.7,
      max_tokens: studentConfig.ai_max_tokens || 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI generation error: ${error}`)
  }

  const data = await response.json()
  return {
    response: data.choices[0].message.content,
    tokens_used: data.usage.total_tokens
  }
}

async function saveDialogue(
  supabase: any,
  studentId: string,
  subjectId: string | null,
  question: string,
  response: string,
  sources: Source[],
  tokensUsed: number,
  model: string,
  provider: string
): Promise<string> {
  const { data, error } = await supabase
    .from('student_dialogues')
    .insert({
      student_id: studentId,
      subject_id: subjectId || null,
      initial_question: question,
      messages: [
        { role: 'user', content: question },
        { role: 'assistant', content: response }
      ],
      sources_used: sources.map(s => ({
        material_id: s.material_id,
        title: s.title,
        source_type: s.source_type,
        similarity: s.similarity
      })),
      total_messages: 2,
      total_user_messages: 1,
      total_ai_messages: 1,
      total_tokens: tokensUsed,
      total_sources: sources.length,
      model_used: model,
      ai_provider: provider
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving dialogue:', error)
    return ''
  }

  return data.id
}

// ================================================================
// MAIN HANDLER
// ================================================================

serve(async (req) => {
  const startTime = Date.now()

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

    // Parsear body
    const body: StudentOracleRequest = await req.json()
    const { studentId, subjectId, question, conversationHistory, sessionId, includeSources = true } = body

    if (!question || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'La pregunta es requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Obtener o crear estudiante para este usuario
    const { data: studentData, error: studentError } = await supabase.rpc(
      'get_or_create_student',
      { p_user_id: user.id }
    )

    if (studentError || !studentData) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener/crear perfil de estudiante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actualStudentId = studentId || studentData

    // Verificar que el usuario tiene acceso a este estudiante
    const { data: studentConfig, error: configError } = await getStudentConfig(supabase, actualStudentId)
    
    if (configError || !studentConfig) {
      return new Response(
        JSON.stringify({ error: 'Estudiante no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (studentConfig.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'No tienes acceso a este estudiante' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Actualizar last_active_at
    await supabase
      .from('students')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', actualStudentId)

    // Si hay subjectId, verificar acceso
    if (subjectId) {
      const { data: subjectData } = await supabase
        .from('student_subjects')
        .select('id')
        .eq('id', subjectId)
        .eq('student_id', actualStudentId)
        .single()
      
      if (!subjectData) {
        return new Response(
          JSON.stringify({ error: 'No tienes acceso a esta asignatura' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Crear embedding de la pregunta
    const queryEmbedding = await createEmbedding(question)

    // Buscar chunks relevantes en los materiales DEL ESTUDIANTE
    const sources = await queryStudentChunks(
      supabase,
      actualStudentId,
      queryEmbedding,
      subjectId,
      10
    )

    // Generar respuesta socrática
    const { response, tokens_used } = await generateSocraticResponse(
      question,
      sources,
      studentConfig,
      conversationHistory || []
    )

    // Guardar diálogo
    const dialogueId = await saveDialogue(
      supabase,
      actualStudentId,
      subjectId || null,
      question,
      response,
      sources,
      tokens_used,
      studentConfig.ai_model || 'gpt-4o-mini',
      studentConfig.ai_provider || 'openai'
    )

    const responseTime = Date.now() - startTime

    const result: StudentOracleResponse = {
      response,
      student_id: actualStudentId,
      subject_id: subjectId || undefined,
      sources: includeSources ? sources : [],
      total_sources: sources.length,
      model: studentConfig.ai_model || 'gpt-4o-mini',
      provider: studentConfig.ai_provider || 'openai',
      tokens_used,
      response_time_ms: responseTime,
      session_id: dialogueId || sessionId || ''
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in student-oracle:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
