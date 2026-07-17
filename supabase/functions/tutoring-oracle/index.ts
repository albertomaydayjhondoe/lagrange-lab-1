/**
 * TUTORING ORACLE - AI Tutoring Assistant with RAG
 * 
 * This function provides AI-powered tutoring using:
 * - RAG (Retrieval Augmented Generation) with materials
 * - Subject-specific context
 * - Conversation history
 * 
 * REQUIRED: AI_API_KEY environment variable
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getEmbedding } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Configuration
const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";
const MAX_CONTEXT_LENGTH = 4000;
const MAX_HISTORY_LENGTH = 20;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

// In-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface TutoringRequest {
  subjectId: string;
  question: string;
  sessionId?: string;
  topicId?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  includeRag?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get AI API Key
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "AI_API_KEY no configurada. Esta función requiere una API key de IA." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
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
          JSON.stringify({ 
            error: "Límite de peticiones excedido. Espera un momento.",
            retryAfter: rateEntry.resetAt - now
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rateEntry.count++;
    } else {
      rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    // Parse request body
    let body: TutoringRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!body.subjectId || !body.question) {
      return new Response(
        JSON.stringify({ error: "subjectId y question son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subjectId, question, sessionId, topicId, conversationHistory, includeRag = true } = body;

    // Fetch subject info
    const { data: subject } = await supabase
      .from('subjects')
      .select('name, description')
      .eq('id', subjectId)
      .single();

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "Materia no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch topic if provided
    let topicInfo = null;
    if (topicId) {
      const { data: topic } = await supabase
        .from('topics')
        .select('name, description')
        .eq('id', topicId)
        .single();
      topicInfo = topic;
    }

    // RAG: Fetch relevant materials
    let ragContext = '';
    let materialsUsed: any[] = [];
    
    if (includeRag) {
      try {
        // Generate embedding for the question
        const queryEmbedding = await getEmbedding(question, AI_API_KEY);
        
        // Search for relevant materials
        const { data: materials } = await supabase.rpc('match_materials', {
          query_embedding: queryEmbedding,
          match_subject_id: subjectId,
          match_topic_id: topicId || null,
          match_count: 5
        });

        if (materials && materials.length > 0) {
          materialsUsed = materials;
          ragContext = formatMaterialsContext(materials);
        }
      } catch (ragError) {
        console.error("RAG error:", ragError);
        // Continue without RAG context
      }
    }

    // Build system prompt
    const systemPrompt = buildTutoringPrompt(subject, topicInfo, ragContext);
    
    // Build messages array
    const messages = buildMessages(systemPrompt, question, conversationHistory || []);

    // Call AI
    const startTime = Date.now();
    const aiResponse = await callAI(AI_API_KEY, messages);
    const responseTime = Date.now() - startTime;

    // Estimate tokens (rough)
    const estimatedTokens = Math.ceil((question.length + aiResponse.length) / 4);

    // Save to history
    try {
      await supabase.from('tutoring_history').insert({
        session_id: sessionId || null,
        subject_id: subjectId,
        student_id: user.id,
        topic_id: topicId || null,
        question: question,
        ai_response: aiResponse,
        materials_used: materialsUsed.map(m => ({ id: m.id, title: m.title })),
        rag_context_used: materialsUsed.length > 0,
        token_usage: estimatedTokens,
        response_time_ms: responseTime,
      });
    } catch (historyError) {
      console.error("Failed to save history:", historyError);
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        subject: subject.name,
        topic: topicInfo?.name || null,
        materials_used: materialsUsed.length,
        rag_context_used: materialsUsed.length > 0,
        model: AI_CHAT_MODEL,
        response_time_ms: responseTime,
        tokens_used: estimatedTokens,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Tutoring Oracle error:", error);
    
    if (error instanceof Error && error.message.includes("AI_API_KEY")) {
      return new Response(
        JSON.stringify({ 
          error: "API Key de IA no configurada. Configura AI_API_KEY en las variables de entorno de Supabase."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildTutoringPrompt(subject: any, topic: any, ragContext: string): string {
  let prompt = `Eres un tutor de IA especializado en ${subject.name}. `;
  
  if (subject.description) {
    prompt += `${subject.description}\n\n`;
  }

  if (topic) {
    prompt += `Estás enfocándote en el tema: ${topic.name}.`;
    if (topic.description) {
      prompt += ` ${topic.description}`;
    }
    prompt += `\n\n`;
  }

  prompt += `## Guidelines:
- Responde de manera clara, didáctica y paciente
- Usa ejemplos prácticos cuando sea posible
- Si no sabes algo, admítelo honestamente
- Alienta el pensamiento crítico
- Adapta tu explicación al nivel del estudiante
- Usa el contexto de materiales proporcionado cuando sea relevante

## Formato preferido:
- Explicación breve del concepto
- Ejemplo práctico o analógico
- Paso a paso si es proceso
- Pregunta de verificación al final`;

  if (ragContext) {
    prompt += `\n\n## Materiales de referencia (usa cuando sea relevante):
${ragContext}`;
  }

  return prompt;
}

function buildMessages(
  systemPrompt: string,
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): any[] {
  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  // Add conversation history (limited)
  const recentHistory = history.slice(-MAX_HISTORY_LENGTH);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }
  
  // Add current question
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
    
    if (response.status === 429) {
      throw new Error("Límite de la API de IA excedido. Intenta de nuevo en unos minutos.");
    }
    if (response.status === 401) {
      throw new Error("API Key de IA inválida. Verifica AI_API_KEY.");
    }
    if (response.status === 402) {
      throw new Error("Créditos de la API de IA agotados.");
    }
    
    throw new Error(`Error de la API de IA: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("La IA no devolvió respuesta");
  }

  return content;
}

function formatMaterialsContext(materials: any[]): string {
  return materials.map((m, i) => 
    `[Material ${i + 1}: ${m.title}]\n${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`
  ).join('\n\n');
}
