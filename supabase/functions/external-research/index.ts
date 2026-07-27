/**
 * EXTERNAL RESEARCH - Wikipedia Fallback para RAG
 * 
 * Flujo según flowchart:
 * E1: Extrae término de búsqueda de la pregunta (vía IA: "resume en 1-3 palabras clave")
 * E2: Llama a la API pública de Wikipedia (sin API key)
 * E3: ¿Wikipedia devuelve resultado?
 * E4: Extrae extracto/resumen del artículo
 * E5: Devuelve null si no hay resultado (degradación con gracia)
 * 
 * Rate limiting: máx. 1 llamada por academia cada 60 segundos
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Configuration
const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";

// Rate limiting: 1 request per academy per 60 seconds
const EXTERNAL_RESEARCH_RATE_LIMIT_MS = 60000;
const externalResearchRateLimitStore = new Map<string, number>();

export interface ExternalResearchRequest {
  question: string;
  language?: 'es' | 'en';
  academyId?: string;
}

export interface ExternalResearchResult {
  found: boolean;
  searchTerm?: string;
  title?: string;
  extract?: string;
  url?: string;
  language?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Rate limit check for external research (per academy)
 * Returns true if allowed, false if rate limited
 */
function checkExternalResearchRateLimit(academyId: string): boolean {
  const now = Date.now();
  const lastCall = externalResearchRateLimitStore.get(academyId) || 0;
  
  if (now - lastCall < EXTERNAL_RESEARCH_RATE_LIMIT_MS) {
    console.log(`External research rate limited for academy ${academyId}`);
    return false;
  }
  
  externalResearchRateLimitStore.set(academyId, now);
  return true;
}

/**
 * Extract search term from user question using AI
 * "Resume esta pregunta en 1-3 palabras clave de búsqueda"
 */
async function extractSearchTerm(question: string, language: 'es' | 'en', apiKey: string): Promise<string> {
  const systemPrompt = language === 'es'
    ? `Eres un asistente que extrae términos de búsqueda. Analiza la pregunta del usuario yExtrae SOLO los 1-3 términos clave más relevantes para buscar en Wikipedia. Devuelve ÚNICAMENTE los términos separados por espacios, sin explicaciones ni puntuación adicional.`
    : `You are an assistant that extracts search terms. Analyze the user's question and extract ONLY the 1-3 most relevant keywords for searching on Wikipedia. Return ONLY the terms separated by spaces, without explanations or additional punctuation.`;

  const userPrompt = language === 'es'
    ? `Pregunta: "${question}"\nTérminos de búsqueda:` 
    : `Question: "${question}"\nSearch terms:`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 30,
      }),
    });

    if (!response.ok) {
      console.warn("Failed to extract search term via AI, using fallback");
      return extractSearchTermFallback(question);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (content) {
      // Clean up the response - remove quotes, extra spaces
      return content.replace(/["'.,;:!?]/g, '').trim().slice(0, 100);
    }
    
    return extractSearchTermFallback(question);
  } catch (error) {
    console.warn("Error extracting search term:", error);
    return extractSearchTermFallback(question);
  }
}

/**
 * Fallback: extract search terms without AI
 */
function extractSearchTermFallback(question: string): string {
  // Remove common words and get significant terms
  const stopWords = new Set([
    'es', 'son', 'está', 'están', 'qué', 'como', 'cuál', 'cuáles',
    'por', 'para', 'con', 'sin', 'sobre', 'entre', 'y', 'o', 'pero',
    'porque', 'cuando', 'donde', 'mientras', 'que', 'de', 'del', 'la',
    'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'a', 'en', 'on',
    'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'this', 'that', 'these', 'those'
  ]);

  const words = question.toLowerCase()
    .replace(/[¿?¡!.,;:()\[\]{}]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Return top 3 most significant words
  return words.slice(0, 3).join(' ') || question.slice(0, 30);
}

/**
 * Search Wikipedia API for a term
 */
async function searchWikipedia(term: string, language: 'es' | 'en'): Promise<{ title: string; url: string; extract: string } | null> {
  const baseUrl = language === 'es' 
    ? 'https://es.wikipedia.org' 
    : 'https://en.wikipedia.org';

  try {
    // Step 1: Search for the term
    const searchUrl = `${baseUrl}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*&srlimit=1`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      console.warn(`Wikipedia search failed: ${searchResponse.status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    const results = searchData.query?.search;
    
    if (!results || results.length === 0) {
      console.log(`No Wikipedia results for: ${term}`);
      return null;
    }

    const topResult = results[0];
    const title = topResult.title;

    // Step 2: Get the extract/summary of the article
    const extractUrl = `${baseUrl}/w/api.php?action=query&prop=extracts&exintro=true&titles=${encodeURIComponent(title)}&format=json&origin=*&explaintext=true`;
    
    const extractResponse = await fetch(extractUrl);
    if (!extractResponse.ok) {
      console.warn(`Wikipedia extract failed: ${extractResponse.status}`);
      return null;
    }

    const extractData = await extractResponse.json();
    const pages = extractData.query?.pages;
    
    if (!pages) {
      return null;
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    // Skip if page doesn't exist or has no extract
    if (pageId === '-1' || !page.extract) {
      return null;
    }

    const extract = page.extract;
    
    // Limit extract size (max ~2000 chars)
    const truncatedExtract = extract.length > 2000 
      ? extract.slice(0, 1997) + '...' 
      : extract;

    return {
      title: title,
      url: `${baseUrl}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      extract: truncatedExtract
    };
  } catch (error) {
    console.error("Wikipedia API error:", error);
    return null;
  }
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

    let body: ExternalResearchRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { question, language = 'es', academyId } = body;

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: "question es requerido y debe ser string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check (if academyId provided)
    if (academyId) {
      if (!checkExternalResearchRateLimit(academyId)) {
        return new Response(
          JSON.stringify({ 
            error: "Demasiadas peticiones externas. Espera un momento.",
            found: false 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`External research for question: "${question.slice(0, 100)}..." (lang: ${language})`);

    // E1: Extract search term using AI
    const searchTerm = await extractSearchTerm(question, language, AI_API_KEY);
    console.log(`Extracted search term: "${searchTerm}"`);

    // E2: Search Wikipedia
    const wikiResult = await searchWikipedia(searchTerm, language);

    // E3-E4: Process result or return null (graceful degradation)
    if (!wikiResult) {
      console.log(`No Wikipedia result found for: "${searchTerm}"`);
      return new Response(
        JSON.stringify({
          found: false,
          searchTerm,
          error: "No se encontró información relevante en Wikipedia",
          language,
          timestamp: new Date().toISOString()
        } as ExternalResearchResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // E5: Return successful result
    const result: ExternalResearchResult = {
      found: true,
      searchTerm,
      title: wikiResult.title,
      extract: wikiResult.extract,
      url: wikiResult.url,
      language,
      timestamp: new Date().toISOString()
    };

    console.log(`Wikipedia result found: "${wikiResult.title}"`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("External research error:", error);
    
    // Graceful degradation - return null instead of error
    return new Response(
      JSON.stringify({
        found: false,
        error: error instanceof Error ? error.message : "Error desconocido"
      } as ExternalResearchResult),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
