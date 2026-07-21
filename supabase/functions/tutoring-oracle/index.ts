/**
 * TUTORING ORACLE - Tutor IA con RAG y Procedencia Completa
 * 
 * Flujo según flowchart:
 * RESEARCH → RESEARCH_FLOW (R1 → R2 → R3 → R4 → R5) → PROVENANCE
 * 
 * RESEARCH_FLOW:
 * R1: Estudiante pregunta sobre sus fuentes
 * R2: Genera embedding de la pregunta
 * R3: match_corpus_fragments filtrado por academy_id + space_id dinámico
 * R4: Tutor IA compone respuesta usando SOLO esos fragmentos
 * R5: Respuesta con procedencia adjunta
 * 
 * PROVENANCE:
 * P1: Fragmento exacto usado (source_file + snippet)
 * P2: Formato original (PDF pág X / min Y / URL)
 * P3: Similitud semántica (score 0-1)
 * P4: Modelo IA + timestamp
 * P5: Marca de inferencia sin respaldo directo
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getEmbedding } from "../_shared/embeddings.ts";
import { fetchCorpusFragmentsWithRAG, formatCorpusContext, ProvenanceData, RAGResult } from "../_shared/corpusRetrieval.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Configuration
const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";
const MAX_CONTEXT_LENGTH = 4000;
const MAX_HISTORY_LENGTH = 20;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 20;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface ProvenanceEntry {
  fragment_id: string;
  source_file: string;
  source_type: string;
  source_content: string;
  original_url?: string;
  page_reference?: string;
  similarity_score: number;
  citation_order: number;
  is_inference_only: boolean;
  ingested_at?: string;
  uploaded_by?: string;
}

interface TutoringRequest {
  academyId: string;           // REQUERIDO: academia
  spaceId?: string;            // OPCIONAL: espacio dinámico (sin lista fija de ejes)
  question: string;            // REQUERIDO: pregunta del estudiante
  sessionId?: string;
  systemPrompt?: string;       // System prompt personalizado del tutor
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  includeRag?: boolean;
  maxSources?: number;         // Número máximo de fuentes a usar
}

interface TutorResponse {
  response: string;
  academy_id: string;
  space_id?: string;
  provenance: ProvenanceEntry[];
  has_inference_only: boolean;
  total_sources: number;
  model: string;
  response_time_ms: number;
  tokens_used: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticación requerida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido o expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const rateLimitKey = `tutoring:${user.id}`;
    const now = Date.now();
    const rateEntry = rateLimitStore.get(rateLimitKey);
    
    if (rateEntry && now < rateEntry.resetAt) {
      if (rateEntry.count >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({ error: "Límite excedido", retryAfter: rateEntry.resetAt - now }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rateEntry.count++;
    } else {
      rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    let body: TutoringRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.academyId || !body.question) {
      return new Response(
        JSON.stringify({ error: "academyId y question son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      academyId, 
      spaceId, 
      question, 
      sessionId, 
      systemPrompt, 
      conversationHistory, 
      includeRag = true,
      maxSources = 5 
    } = body;

    // Validar acceso a la academia
    const { data: academy } = await supabase
      .from('academies')
      .select('id, name, is_public')
      .eq('id', academyId)
      .single();

    if (!academy) {
      return new Response(
        JSON.stringify({ error: "Academia no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RAG: RESEARCH_FLOW (R2 → R3)
    let ragResult: RAGResult = {
      fragments: [],
      provenance: [],
      has_inference_only: false,
      total_sources: 0
    };
    
    if (includeRag) {
      try {
        // R2: Genera embedding de la pregunta
        const queryEmbedding = await getEmbedding(question, AI_API_KEY);
        
        // R3: match_corpus_fragments filtrado por academy_id + space_id dinámico
        ragResult = await fetchCorpusFragmentsWithRAG(
          supabase,
          academyId,
          queryEmbedding,
          spaceId || undefined,
          maxSources
        );
      } catch (ragError) {
        console.error("RAG error:", ragError);
        ragResult.has_inference_only = true;
      }
    } else {
      ragResult.has_inference_only = true;
    }

    // Build system prompt
    const promptAcademyInfo = `Estás ayudando al estudiante en la academia: **${academy.name}**.`;
    const promptSpaceInfo = spaceId ? `\nEspacio de investigación activo.` : '';
    const promptSourcesInfo = ragResult.fragments.length > 0 
      ? `\nTienes ${ragResult.fragments.length} fragmentos de material de investigación disponibles para usar como referencia.` 
      : '\nNo hay material de investigación disponible en este momento.';

    const baseSystemPrompt = systemPrompt || `Eres un tutor de IA especializado en ayudar a los estudiantes a investigar y aprender.`;

    const systemMessage = `${baseSystemPrompt}

${promptAcademyInfo}${promptSpaceInfo}${promptSourcesInfo}

## Guidelines:
- Responde de manera clara, didáctica y paciente
- Usa ejemplos prácticos cuando sea posible
- Si no sabes algo, admítelo honestamente
- Alienta el pensamiento crítico
- Adapta tu explicación al nivel del estudiante
- IMPORTANTE: Cuando respondas usando información del material de investigación, cita la fuente correspondiente`;

    // R4: Tutor IA compone respuesta usando SOLO fragmentos como contexto
    let ragContext = '';
    if (ragResult.fragments.length > 0) {
      ragContext = formatCorpusContext(ragResult.fragments, true);
    }

    const finalSystemPrompt = ragContext 
      ? `${systemMessage}\n\n${ragContext}\n\n**Usa las fuentes anteriores para fundamentar tu respuesta. Si la información no está en las fuentes, indica claramente que es conocimiento general.**`
      : systemMessage;

    // Build messages
    const messages = buildMessages(finalSystemPrompt, question, conversationHistory || []);

    // Call AI
    const startTime = Date.now();
    const aiResponse = await callAI(AI_API_KEY, messages);
    const responseTime = Date.now() - startTime;
    const estimatedTokens = Math.ceil((question.length + aiResponse.length) / 4);

    // P5: Verificar si hay inferencia sin respaldo directo
    const hasInferenceOnly = ragResult.has_inference_only || 
      (ragResult.fragments.length === 0 && !includeRag);

    // P1-P4: Preparar provenance para respuesta
    const provenance: ProvenanceEntry[] = ragResult.provenance.map((p: ProvenanceData, i: number) => ({
      fragment_id: p.fragment_id,
      source_file: p.source_file,
      source_type: p.source_type,
      source_content: p.source_content.substring(0, 500),
      original_url: p.original_url,
      page_reference: p.page_reference,
      similarity_score: p.similarity_score,
      citation_order: p.citation_order || i + 1,
      is_inference_only: hasInferenceOnly && i >= ragResult.fragments.length,
      ingested_at: p.ingested_at,
      uploaded_by: p.uploaded_by
    }));

    // Save to history
    try {
      await supabase.from('tutoring_history').insert({
        session_id: sessionId || null,
        subject_id: academyId,
        student_id: user.id,
        question: question,
        ai_response: aiResponse,
        materials_used: ragResult.fragments.map(f => ({ id: f.id, title: f.title })),
        rag_context_used: ragResult.fragments.length > 0,
        token_usage: estimatedTokens,
        response_time_ms: responseTime,
      });
    } catch (historyError) {
      console.error("Failed to save history:", historyError);
    }

    const response: TutorResponse = {
      response: aiResponse,
      academy_id: academyId,
      space_id: spaceId,
      provenance,
      has_inference_only: hasInferenceOnly,
      total_sources: ragResult.fragments.length,
      model: AI_CHAT_MODEL,
      response_time_ms: responseTime,
      tokens_used: estimatedTokens,
    };

    return new Response(JSON.stringify(response), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Tutoring Oracle error:", error);
    
    if (error instanceof Error && error.message.includes("AI_API_KEY")) {
      return new Response(
        JSON.stringify({ error: "API Key de IA no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildMessages(
  systemPrompt: string,
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): any[] {
  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  const recentHistory = history.slice(-MAX_HISTORY_LENGTH);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }
  
  messages.push({ role: "user", content: question });
  
  return messages;
}

async function callAI(apiKey: string, messages: any[]): Promise<string> {
  const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_CHAT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    
    if (response.status === 429) throw new Error("Límite de API excedido");
    if (response.status === 401) throw new Error("API Key inválida");
    if (response.status === 402) throw new Error("Créditos agotados");
    throw new Error(`Error de API: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error("La IA no devolvió respuesta");

  return content;
}
