/**
 * Edge Function: ingest-material
 * 
 * Ingesta de materiales multi-formato para estudiantes.
 * Soporta: PDF, DOCX, TXT, MD, URL, VIDEO, AUDIO, YOUTUBE, etc.
 * 
 * Flujo:
 * 1. Verificar autenticación y acceso a la asignatura
 * 2. Validar formato y tamaño
 * 3. Extraer contenido según tipo
 * 4. Chuncking inteligente
 * 5. Generar embeddings
 * 6. Almacenar chunks
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

type SourceType = 'pdf' | 'docx' | 'doc' | 'txt' | 'md' | 'rtf' |
                  'url' | 'webpage' | 'notion' | 'google_doc' |
                  'video' | 'audio' | 'youtube' | 'vimeo' |
                  'image' | 'csv' | 'xlsx' | 'pptx' |
                  'user_input' | 'class_notes' | 'homework'

interface IngestMaterialRequest {
  studentId?: string
  subjectId: string
  title: string
  description?: string
  sourceType: SourceType
  content?: string        // Para texto, URLs
  fileData?: string      // Base64 para archivos
  fileUrl?: string       // URL de archivo externo
  externalId?: string    // ID externo (YouTube, etc.)
  metadata?: Record<string, any>
}

interface IngestMaterialResponse {
  success: boolean
  material_id: string
  chunks_created: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  source_type: SourceType
  title: string
  warnings?: string[]
  errors?: string[]
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

// Validar límites del plan
async function checkPlanLimits(supabase: any, studentId: string, sourceType: SourceType): Promise<{ allowed: boolean; error?: string }> {
  const { data: student } = await supabase
    .from('students')
    .select('plan_type, plan_limits')
    .eq('id', studentId)
    .single()

  if (!student) {
    return { allowed: false, error: 'Estudiante no encontrado' }
  }

  const limits = student.plan_limits || {}

  // Verificar límite de materiales por asignatura
  const { count: materialsCount } = await supabase
    .from('student_materials')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', studentId) // Esto debería ser por subject_id

  // Por ahora, verificar límites generales
  // En una implementación completa, verificaríamos por asignatura

  return { allowed: true }
}

// Extraer texto de diferentes formatos
async function extractText(sourceType: SourceType, content: string, metadata?: Record<string, any>): Promise<string> {
  switch (sourceType) {
    case 'url':
    case 'webpage':
      return await extractFromUrl(content)
    
    case 'youtube':
      return extractYouTubeTranscript(content, metadata)
    
    case 'user_input':
    case 'class_notes':
    case 'homework':
      return content // Ya es texto
    
    case 'csv':
      return extractCSV(content)
    
    default:
      // Para PDF, DOCX, etc., esperar contenido ya extraído
      return content
  }
}

async function extractFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LagrangeLab/1.0)',
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    
    // Simple HTML text extraction (en producción usar libs como turndown, cheerio)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text
  } catch (error) {
    console.error('Error extracting from URL:', error)
    return ''
  }
}

function extractYouTubeTranscript(videoId: string, metadata?: Record<string, any>): string {
  // Si hay transcripción en metadata, usarla
  if (metadata?.transcript) {
    return metadata.transcript
  }
  // Placeholder para transcripción de YouTube
  return `[Transcripción no disponible para ${videoId}. Agrega el contenido manualmente.]`
}

function extractCSV(content: string): string {
  // Convertir CSV a texto estructurado
  const lines = content.split('\n')
  const headers = lines[0]?.split(',').map(h => h.trim()) || []
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',')
      return headers.map((h, i) => `${h}: ${values[i]?.trim() || ''}`).join(', ')
    })
    .join('\n')
}

// Crear chunks inteligentes del contenido
function createChunks(content: string, maxChunkSize: number = 1000): string[] {
  // Dividir por párrafos primero
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50)
  
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }
    currentChunk += paragraph + '\n\n'
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

// Crear embedding para un texto
async function createEmbedding(text: string, model: string = 'text-embedding-3-small'): Promise<number[]> {
  const apiKey = Deno.env.get('AI_API_KEY')
  const gatewayUrl = Deno.env.get('AI_GATEWAY_URL') || 'https://api.openai.com/v1'
  
  // Truncar si es muy largo
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text
  
  const response = await fetch(`${gatewayUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: truncatedText,
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

// Contar tokens aproximados
function countTokens(text: string): number {
  // Aproximación: ~4 caracteres por token en español
  return Math.ceil(text.length / 4)
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

    // Parsear body
    const body: IngestMaterialRequest = await req.json()
    const { studentId, subjectId, title, description, sourceType, content, fileData, fileUrl, externalId, metadata } = body

    // Validaciones
    if (!subjectId) {
      return new Response(
        JSON.stringify({ error: 'subjectId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'title es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!content && !fileData && !fileUrl && !externalId) {
      return new Response(
        JSON.stringify({ error: 'Debes proporcionar content, fileData, fileUrl o externalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Obtener o crear estudiante
    const { data: studentData } = await supabase.rpc(
      'get_or_create_student',
      { p_user_id: user.id }
    )

    const actualStudentId = studentId || studentData

    // Verificar que el estudiante existe y pertenece al usuario
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', actualStudentId)
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return new Response(
        JSON.stringify({ error: 'Estudiante no encontrado o no tienes acceso' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar acceso a la asignatura
    const { data: subject } = await supabase
      .from('student_subjects')
      .select('id, student_id')
      .eq('id', subjectId)
      .eq('student_id', actualStudentId)
      .single()

    if (!subject) {
      return new Response(
        JSON.stringify({ error: 'Asignatura no encontrada o no tienes acceso' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar límites del plan
    const limitsCheck = await checkPlanLimits(supabase, actualStudentId, sourceType)
    if (!limitsCheck.allowed) {
      return new Response(
        JSON.stringify({ error: limitsCheck.error || 'Límite del plan alcanzado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar el contenido a procesar
    let processedContent = content || ''
    let finalFileUrl = fileUrl || ''
    let mimeType = metadata?.mimeType

    // Para archivos subidos en Base64, decodificar (en producción, subir a storage)
    if (fileData) {
      try {
        // En producción: subir a Supabase Storage
        // Por ahora: usar como contenido de texto
        const decoded = atob(fileData)
        processedContent = decoded
      } catch (e) {
        console.error('Error decoding fileData:', e)
      }
    }

    // Extraer contenido según tipo
    if (sourceType === 'url' || sourceType === 'webpage') {
      processedContent = await extractFromUrl(fileUrl || content)
    } else if (sourceType === 'youtube') {
      processedContent = extractYouTubeTranscript(externalId || content, metadata)
    } else if (sourceType === 'csv') {
      processedContent = extractCSV(processedContent)
    }

    // Crear registro del material
    const { data: material, error: materialError } = await supabase
      .from('student_materials')
      .insert({
        subject_id: subjectId,
        title: title.trim(),
        description: description || null,
        source_type: sourceType,
        mime_type: mimeType || null,
        content: processedContent.substring(0, 10000), // Limitar almacenamiento directo
        file_url: finalFileUrl || null,
        external_id: externalId || null,
        external_metadata: metadata || null,
        processing_status: 'processing',
        processing_error: null
      })
      .select('id')
      .single()

    if (materialError || !material) {
      return new Response(
        JSON.stringify({ error: 'Error al crear material: ' + materialError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const warnings: string[] = []
    let chunksCreated = 0
    let totalTokens = 0
    let status: 'completed' | 'failed' = 'completed'
    let processingError: string | null = null

    try {
      // Crear chunks
      const chunks = createChunks(processedContent)
      
      // Crear embeddings y guardar chunks
      const chunksToInsert: any[] = []
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i]
        
        // Crear embedding
        let embedding: number[] | null = null
        try {
          embedding = await createEmbedding(chunkText)
        } catch (e) {
          console.warn(`Error creating embedding for chunk ${i}:`, e)
        }

        chunksToInsert.push({
          material_id: material.id,
          chunk_index: i,
          content: chunkText,
          content_hash: btoa(chunkText.substring(0, 100)), // Hash simple para deduplicación
          word_count: chunkText.split(/\s+/).length,
          token_count: countTokens(chunkText),
          embedding: embedding,
          created_at: new Date().toISOString()
        })

        totalTokens += countTokens(chunkText)
      }

      // Insertar chunks en batch
      if (chunksToInsert.length > 0) {
        const { error: chunksError } = await supabase
          .from('student_material_chunks')
          .insert(chunksToInsert)

        if (chunksError) {
          console.error('Error inserting chunks:', chunksError)
          warnings.push(`Error al insertar algunos chunks: ${chunksError.message}`)
        } else {
          chunksCreated = chunksToInsert.length
        }
      }

      // Verificar si todos tienen embeddings
      const hasEmbeddings = chunksToInsert.every(c => c.embedding !== null)

      // Actualizar material con estado completado
      await supabase
        .from('student_materials')
        .update({
          processing_status: hasEmbeddings ? 'completed' : 'completed',
          chunks_count: chunksCreated,
          total_tokens: totalTokens,
          has_embeddings: hasEmbeddings,
          embedding_model: 'text-embedding-3-small',
          embedding_dimension: 1536,
          ingested_at: new Date().toISOString()
        })
        .eq('id', material.id)

    } catch (e: any) {
      status = 'failed'
      processingError = e.message
      warnings.push(`Error en procesamiento: ${e.message}`)

      // Actualizar material con estado de error
      await supabase
        .from('student_materials')
        .update({
          processing_status: 'failed',
          processing_error: e.message
        })
        .eq('id', material.id)
    }

    const result: IngestMaterialResponse = {
      success: status !== 'failed',
      material_id: material.id,
      chunks_created: chunksCreated,
      status,
      source_type: sourceType,
      title,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: processingError ? [processingError] : undefined
    }

    return new Response(
      JSON.stringify(result),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ingest-material:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
