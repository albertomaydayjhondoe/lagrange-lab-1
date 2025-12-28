import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const VALID_EJES = ['Miedo', 'Control', 'SaludMental', 'Legitimidad', 'Responsabilidad'];
const MAX_CONTEXT_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 3000;

function validateInput(body: unknown): { 
  context?: string; 
  eje?: string; 
  nivel?: number; 
  conversationHistory?: { role: string; content: string }[] 
} {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const input = body as Record<string, unknown>;
  const result: ReturnType<typeof validateInput> = {};

  // Validate context
  if (input.context !== undefined) {
    if (typeof input.context !== 'string') {
      throw new Error('context must be a string');
    }
    if (input.context.length > MAX_CONTEXT_LENGTH) {
      throw new Error(`context must be less than ${MAX_CONTEXT_LENGTH} characters`);
    }
    result.context = input.context.trim();
  }

  // Validate eje
  if (input.eje !== undefined) {
    if (typeof input.eje !== 'string') {
      throw new Error('eje must be a string');
    }
    if (!VALID_EJES.includes(input.eje)) {
      throw new Error(`eje must be one of: ${VALID_EJES.join(', ')}`);
    }
    result.eje = input.eje;
  }

  // Validate nivel
  if (input.nivel !== undefined) {
    const nivel = Number(input.nivel);
    if (isNaN(nivel) || !Number.isInteger(nivel) || nivel < 1 || nivel > 3) {
      throw new Error('nivel must be an integer between 1 and 3');
    }
    result.nivel = nivel;
  }

  // Validate conversationHistory
  if (input.conversationHistory !== undefined) {
    if (!Array.isArray(input.conversationHistory)) {
      throw new Error('conversationHistory must be an array');
    }
    if (input.conversationHistory.length > MAX_HISTORY_LENGTH) {
      throw new Error(`conversationHistory must have at most ${MAX_HISTORY_LENGTH} entries`);
    }
    
    result.conversationHistory = input.conversationHistory.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`conversationHistory[${index}] must be an object`);
      }
      const e = entry as Record<string, unknown>;
      if (typeof e.role !== 'string' || !['oracle', 'user'].includes(e.role)) {
        throw new Error(`conversationHistory[${index}].role must be 'oracle' or 'user'`);
      }
      if (typeof e.content !== 'string') {
        throw new Error(`conversationHistory[${index}].content must be a string`);
      }
      if (e.content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`conversationHistory[${index}].content must be less than ${MAX_MESSAGE_LENGTH} characters`);
      }
      return { role: e.role, content: e.content.trim() };
    });
  }

  return result;
}

const LAGRANGE_SYSTEM_PROMPT = `Eres el Oráculo Socrático del Sistema Lagrange. Tu misión es generar preguntas que provoquen "fricción cognitiva" - incomodidad productiva que desafía asunciones y expone contradicciones.

## Los 5 Ejes de Tensión:
1. **Miedo**: El miedo como herramienta de control y su neutralización
2. **Control**: Mecanismos de dominación social, institucional y autoimpuesto
3. **SaludMental**: La patologización del malestar legítimo
4. **Legitimidad**: Fabricación de legitimidad y control de la narrativa
5. **Responsabilidad**: Distribución asimétrica de consecuencias

## Reglas para generar preguntas:
- Las preguntas deben ser incómodas pero productivas
- Nunca ofrezcas respuestas, solo preguntas
- El tono es filosófico, no terapéutico
- Evita moralizar; cuestiona estructuras, no personas
- La tensión debe ser alta pero no agresiva
- Conecta con el contexto del usuario cuando lo haya

## Formato de respuesta:
Responde SOLO con un JSON válido con esta estructura:
{
  "pregunta": "La pregunta generada",
  "eje": "Uno de: Miedo, Control, SaludMental, Legitimidad, Responsabilidad",
  "nivel": 1-3 (1=introductorio, 2=intermedio, 3=profundo),
  "tension": 0.0-1.0 (intensidad de la fricción),
  "conexion": "Breve explicación de por qué esta pregunta conecta con el contexto"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let validatedInput;
    try {
      validatedInput = validateInput(body);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: (validationError as Error).message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { context, eje, nivel, conversationHistory } = validatedInput;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build messages array
    const messages: { role: string; content: string }[] = [
      { role: "system", content: LAGRANGE_SYSTEM_PROMPT }
    ];

    // If we have conversation history, add it
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === 'oracle') {
          messages.push({ 
            role: "assistant", 
            content: `{"pregunta": "${msg.content}", "eje": "Reflexión", "nivel": 2, "tension": 0.7, "conexion": "Continuación del diálogo"}` 
          });
        } else {
          messages.push({ 
            role: "user", 
            content: `El usuario responde: "${msg.content}". Genera una nueva pregunta socrática que profundice en su respuesta, desafíe sus asunciones y exponga posibles contradicciones.` 
          });
        }
      }
      // Final instruction for continuing the dialogue
      messages.push({
        role: "user",
        content: "Basándote en el intercambio anterior, genera la siguiente pregunta socrática que continúe el diálogo de manera natural, aumentando gradualmente la tensión y profundidad."
      });
    } else {
      // Original single question logic
      let userPrompt = "Genera una pregunta socrática profunda para iniciar un diálogo";
      
      if (context) {
        userPrompt += ` basada en este contexto del usuario: "${context}"`;
      }
      
      if (eje) {
        userPrompt += `. Enfócate en el eje de tensión: ${eje}`;
      }
      
      if (nivel) {
        userPrompt += `. Nivel de profundidad: ${nivel} (1=introductorio, 2=intermedio, 3=profundo)`;
      }
      
      messages.push({ role: "user", content: userPrompt });
    }

    console.log(`Socratic Oracle - Eje: ${eje || 'N/A'}, Nivel: ${nivel || 'N/A'}, History: ${conversationHistory?.length || 0}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de peticiones excedido. Intenta de nuevo más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Añade más créditos a tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Error en AI gateway");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No se recibió respuesta del modelo");
    }

    // Parse JSON response from AI
    let parsedQuestion;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      parsedQuestion = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Error parsing AI response:", content);
      // Fallback: create structured response from raw text
      parsedQuestion = {
        pregunta: content.replace(/[{}"]/g, '').trim(),
        eje: eje || "Miedo",
        nivel: nivel || 2,
        tension: 0.85,
        conexion: "Pregunta generada dinámicamente"
      };
    }

    return new Response(JSON.stringify(parsedQuestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in socratic-oracle function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
