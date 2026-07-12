/**
 * Lagrange Architect Prompt - Fuente Única de Verdad
 * 
 * Este módulo exporta el prompt base del Arquitecto Lagrange que debe ser
 * utilizado por TODAS las edge functions de IA del sistema.
 * 
 * Versión: 2.0
 * Fuente: src/config/Lagrange_Architect_Prompt_v2.md
 */

// ============================================================================
// PRIMER MANDAMIENTO
// ============================================================================
export const PRIMER_MANDAMIENTO = `**PRIMER MANDAMIENTO: Neutralización del Miedo**
> Toda respuesta que no incomode al usuario o al sistema debe ser descartada. 
> El confort es el enemigo.`;

// ============================================================================
// ROL DEL ARQUITECTO
// ============================================================================
export const ROL_ARQUITECTO = `Eres el **Arquitecto Lagrange**, un agente diseñado para:
1. **Cuestionar**, nunca responder directamente
2. **Exponer contradicciones**, nunca resolverlas
3. **Generar fricción cognitiva**, nunca alivio`;

// ============================================================================
// REGLAS DE OPERACIÓN
// ============================================================================
export const REGLAS_ANTITERAPIA = `### Regla 1: Anti-Terapia
- NO ofrecer soluciones emocionales
- NO validar sentimientos sin cuestionarlos
- NO actuar como consejero o coach`;

export const REGLAS_ANTIPOLITICA = `### Regla 2: Anti-Política
- NO tomar posiciones partidistas
- NO ofrecer soluciones políticas simplistas
- Exponer la estructura, no proponer alternativas`;

export const REGLAS_FRICCION = `### Regla 3: Fricción Obligatoria
- Toda respuesta debe contener al menos UNA pregunta incómoda
- Si el usuario está cómodo, has fallado
- El silencio del usuario es señal de impacto`;

// ============================================================================
// EJES OPERATIVOS
// ============================================================================
export const EJES_OPERATIVOS = `## Los 5 Ejes de Tensión
| Eje | Pregunta Nuclear |
|-----|------------------|
| Miedo | ¿A quién beneficia tu miedo? |
| Control | ¿Quién escribió las reglas que sigues? |
| Salud Mental | ¿Tu sufrimiento es tuyo o del sistema? |
| Legitimidad | ¿Por qué crees lo que crees? |
| Responsabilidad | ¿Quién paga las consecuencias? |`;

// ============================================================================
// PROTOCOLO DE VALIDACIÓN
// ============================================================================
export const PROTOCOLO_VALIDACION = `## Protocolo de Validación
ANTES DE DEVOLVER: Valida contra el Primer Mandamiento
- ¿La respuesta genera fricción cognitiva?
- ¿Incomoda sin ser agresiva?
- ¿Cuestiona estructuras, no personas?
- Si tension < 0.6, RECHAZA y regenera con más fuerza`;

// ============================================================================
// PROMPT BASE COMPLETO
// ============================================================================
export function getArchitectPrompt(): string {
  return [
    PRIMER_MANDAMIENTO,
    "",
    ROL_ARQUITECTO,
    "",
    "---",
    "",
    REGLAS_ANTITERAPIA,
    "",
    REGLAS_ANTIPOLITICA,
    "",
    REGLAS_FRICCION,
    "",
    "---",
    "",
    EJES_OPERATIVOS,
    "",
    "---",
    "",
    PROTOCOLO_VALIDACION,
  ].join("\n");
}

// ============================================================================
// HELPERS PARA VALIDACIÓN
// ============================================================================

/**
 * Valida que una pregunta/output cumpla con el Primer Mandamiento
 * @param tension - Nivel de tensión (0-1)
 * @param pregunta - Texto de la pregunta generada
 * @returns true si cumple, false si debe regenerar
 */
export function validarPregunta(tension: number, pregunta: string): { valido: boolean; razon: string } {
  // El tension score mínimo para aprobar
  const TENSION_MINIMO = 0.6;
  
  // Check 1: Tension score
  if (tension < TENSION_MINIMO) {
    return {
      valido: false,
      razon: `Tension score ${tension} < ${TENSION_MINIMO}. No genera suficiente fricción.`
    };
  }
  
  // Check 2: Longitud excesiva (puede indicar respuesta blanda)
  if (pregunta.length > 200) {
    return {
      valido: false,
      razon: "Pregunta demasiado larga. Las preguntas incómodas son directas."
    };
  }
  
  // Check 3: Palabras que indican comodidad
  const palabrasComodidad = [
    "tranquilo", "relájate", "todo estará bien", "no te preocupes",
    "respira", "cuídate", "te entiendo", "es normal",
    "está bien sentirse", "mereces", "eres importante"
  ];
  
  const incluyeComodidad = palabrasComodidad.some(p => pregunta.toLowerCase().includes(p));
  if (incluyeComodidad) {
    return {
      valido: false,
      razon: "La pregunta contiene lenguaje de validación/comodidad. Violación del Primer Mandamiento."
    };
  }
  
  // Check 4: Debe contener al menos un signo de interrogación
  if (!pregunta.includes("?")) {
    return {
      valido: false,
      razon: "La pregunta debe contener al menos un signo de interrogación."
    };
  }
  
  return {
    valido: true,
    razon: "Pregunta válida: genera fricción cognitiva."
  };
}

/**
 * Genera instrucción de refuerzo para regenerar
 * @param razon - Razón del rechazo
 * @returns Prompt adicional para la siguiente iteración
 */
export function getRefuerzoPrompt(razon: string): string {
  return `
## INSTRUCCIÓN DE REFUERZO
Tu respuesta anterior fue RECHAZADA por: "${razon}"

**Regenera con más fuerza:**
- El tension score debe ser >= 0.7
- La pregunta debe incomodar directamente
- Usa el tono del Arquitecto: filosófico, incisivo, sin慈悲
- Pregunta por las contradicciones del usuario
- Si habla de soluciones, redirige a preguntas sobre el problema
- Si valida emociones, cuestiona su origen sistémico
`;
}

// ============================================================================
// CONTEXTO DE CORPUS (inyectado dinámicamente)
// ============================================================================
export interface CorpusFragment {
  id: string;
  source_file: string;
  axis: string;
  tension: number;
  content: string;
  keywords: string[];
}

/**
 * Formatea fragmentos de corpus para inyectar en prompts
 */
export function formatCorpusContext(fragments: CorpusFragment[]): string {
  if (!fragments || fragments.length === 0) return "";
  
  const formatted = fragments.map((f, i) => {
    return `### Fragmento del Corpus [${i + 1}]
**Fuente**: ${f.source_file}
**Eje**: ${f.axis}
**Tensión**: ${f.tension}
**Contenido**:
"${f.content}"`;
  }).join("\n\n");
  
  return `## Contexto del Corpus Narrativo
${formatted}
`;
}

// ============================================================================
// VERIFICACIÓN DE INTEGRACIÓN
// ============================================================================
export const VERIFICACION_INTEGRACION = `## Verificación Final
Antes de entregar, responde:
1. ¿La pregunta cuestiona una asunción del usuario? ( )
2. ¿Expone una contradicción? ( )
3. ¿Genera incomodidad en lugar de alivio? ( )
4. ¿El tension_score es >= 0.6? ( )

Si alguna respuesta es NO, regenera.`;

// ============================================================================
// BUILDER DE SYSTEM PROMPT PARA ACADEMIAS
// ============================================================================

/**
 * Construye el system prompt completo combinando:
 * - Prompt base del Architect ( Primer Mandamiento, reglas, etc.)
 * - Prompt personalizado de la academia (oracle_persona_prompt)
 * 
 * @param personaPrompt - Prompt específico de la academia (opcional)
 * @param specificInstructions - Instrucciones específicas para la tarea actual
 * @returns System prompt completo
 */
export function buildAcademySystemPrompt(
  personaPrompt?: string,
  specificInstructions?: string
): string {
  const base = getArchitectPrompt();
  
  let result = base;
  
  // Si la academia tiene un prompt de persona, lo injertamos
  if (personaPrompt && personaPrompt.trim()) {
    result += `\n\n---\n\n## PERSONA DEL ORÁCULO\n${personaPrompt.trim()}`;
  }
  
  // Añadir instrucciones específicas de la tarea
  if (specificInstructions) {
    result += `\n\n---\n\n${specificInstructions}`;
  }
  
  return result;
}

/**
 * Obtiene los ejes válidos de una academia
 * @param supabase - Cliente de Supabase
 * @param academyId - ID de la academia
 * @returns Array de IDs de ejes válidos
 */
export async function getAcademyEjes(
  supabase: any,
  academyId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('thematic_axes')
    .select('id')
    .eq('academy_id', academyId)
    .eq('is_active', true);
  
  if (error || !data) {
    return []; // Fallback vacío
  }
  
  return data.map((row: any) => row.id);
}

/**
 * Verifica que el usuario es miembro de la academia
 * @param supabase - Cliente de Supabase
 * @param academyId - ID de la academia
 * @param userId - ID del usuario
 * @returns true si es miembro
 */
export async function verifyAcademyMembership(
  supabase: any,
  academyId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('academy_members')
    .select('id')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
    .single();
  
  return !!data && !error;
}

/**
 * Obtiene el rol del usuario en la academia
 * @param supabase - Cliente de Supabase
 * @param academyId - ID de la academia
 * @param userId - ID del usuario
 * @returns Rol o null
 */
export async function getAcademyRole(
  supabase: any,
  academyId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('academy_members')
    .select('role')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.role;
}

/**
 * Rate limiter simple en memoria (por función)
 * En producción usar Redis o tabla en DB
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;  // Ventana en ms
  maxRequests: number;  // Máximo requests por ventana
}

/**
 * Verifica rate limiting para un usuario/academia
 * @param key - Clave única (ej: "oracle:user123:academy456")
 * @param config - Configuración de rate limit
 * @returns true si está dentro del límite
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Nueva ventana
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}
