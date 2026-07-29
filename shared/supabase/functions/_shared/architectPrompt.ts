export function getArchitectPrompt(extraContext?: string): string {
  const basePrompt = `Eres el Arquitecto Lagrange, un agente diseñado para cuestionar estructuras de poder, exponer contradicciones y generar fricción cognitiva sin ofrecer consuelo inmediato.

Principios:
- Nunca resuelvas el problema de forma directa; revela la tensión subyacente.
- Prioriza preguntas incómodas, precisas y productivas.
- Conecta el contenido con los ejes Miedo, Control, SaludMental, Legitimidad y Responsabilidad.
- Evita moralizar o ofrecer soluciones terapéuticas simplistas.
- Mantén un tono filosófico, crítico y precise.

Reglas de respuesta:
- Si el contenido lo permite, introduce una pregunta incómoda o una tensión explícita.
- Usa lenguaje claro, provocador y preciso.
- No repitas lo obvio; profundiza en la estructura que sustenta la afirmación.
- Si hay contexto disponible, úsalo para afinar la respuesta sin perder la fricción.`;

  return extraContext ? `${basePrompt}\n\nContexto adicional:\n${extraContext}` : basePrompt;
}

export function buildAcademySystemPrompt(personaPrompt?: string, specificInstructions?: string): string {
  const basePrompt = `Eres el Arquitecto Lagrange, un oráculo socrático diseñado para cuestionar estructuras de poder, exponer contradicciones y generar fricción cognitiva.

Principios:
- Nunca resuelvas el problema de forma directa; revela la tensión subyacente.
- Prioriza preguntas incómodas, precisas y productivas.
- Evita moralizar o ofrecer soluciones terapéuticas simplistas.
- Mantén un tono filosófico, crítico y preciso.

Reglas de respuesta:
- Si el contenido lo permite, introduce una pregunta incómoda o una tensión explícita.
- Usa lenguaje claro, provocador y preciso.
- No repitas lo obvio; profundiza en la estructura que sustenta la afirmación.
- Si hay contexto disponible, úsalo para afinar la respuesta sin perder la fricción.`;

  let result = basePrompt;
  
  if (personaPrompt) {
    result += `\n\n## Persona del Oráculo:\n${personaPrompt}`;
  }
  
  if (specificInstructions) {
    result += `\n\n${specificInstructions}`;
  }

  return result;
}

export async function verifyAcademyMembership(
  supabase: any,
  academyId: string,
  userId: string
): Promise<boolean> {
  // First check if academy is public
  const { data: academy } = await supabase
    .from('academies')
    .select('is_public')
    .eq('id', academyId)
    .single();

  if (academy?.is_public) {
    return true;
  }

  // Check membership for private academies
  const { data: membership } = await supabase
    .from('academy_members')
    .select('role')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
    .single();

  return !!membership;
}

export async function getAcademyEjes(supabase: any, academyId: string): Promise<string[]> {
  const { data: axes } = await supabase
    .from('thematic_axes')
    .select('label')
    .eq('academy_id', academyId)
    .eq('is_active', true);

  return (axes || []).map((a: any) => a.label);
}

export async function getAcademyRole(
  supabase: any,
  academyId: string,
  userId: string
): Promise<string | null> {
  const { data: membership } = await supabase
    .from('academy_members')
    .select('role')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
    .single();

  return membership?.role || null;
}

export function validarPregunta(tension: number, pregunta: string): { valido: boolean; razon?: string } {
  // Primer Mandamiento: Si el resultado no incomoda, se descarta
  if (tension < 0.6) {
    return { valido: false, razon: 'Tensión demasiado baja. Debe ser al menos 0.6.' };
  }

  // Check for therapeutic or political solutions
  const problematicPatterns = [
    /busca ayuda profesional/i,
    /consulta con un experto/i,
    /terapia de/i,
    /medicación/i,
    /vota por/i,
    /política de/i,
    /solución política/i,
    /respuesta simple/i,
  ];

  for (const pattern of problematicPatterns) {
    if (pattern.test(pregunta)) {
      return { valido: false, razon: 'La pregunta suena a solución terapéutica o política. Rechazada.' };
    }
  }

  return { valido: true };
}

export function getRefuerzoPrompt(razon: string): string {
  return `\n\n## REFUERZO:\nLa pregunta anterior fue rechazada por: ${razon}\nGenera una pregunta con mayor tensión y fricción cognitiva.`;
}

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  options: { windowMs: number; maxRequests: number }
): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, resetAt };
  }

  if (entry.count >= options.maxRequests) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}
