/**
 * Lagrange_IO_Director.js
 * 
 * Director de Entrada/Salida del Sistema Lagrange
 * 
 * Misión: Orquestar el flujo de información entre:
 * - Corpus (Verdad Operativa)
 * - Topología (Grafo de Tensiones)
 * - Usuario (Sujeto de Fricción)
 * - IA (Arquitecto Socrático)
 * 
 * Primer Mandamiento: Si el resultado no incomoda, se descarta.
 */

// Estado del Director
const LagrangeState = {
  initialized: false,
  lastSync: null,
  activeSession: null,
  tensionLevel: 0,
  userInteractions: [],
};

/**
 * Inicializa el Director del Sistema Lagrange
 */
export const initializeLagrange = async () => {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║     LAGRANGE I/O DIRECTOR - INICIALIZANDO     ║");
  console.log("║     'La pregunta es el destino'               ║");
  console.log("╚═══════════════════════════════════════════════╝");

  // TODO: Cargar configuración del Arquitecto
  // TODO: Inicializar conexión con narrativeMatrix
  // TODO: Verificar integridad del corpus
  // TODO: Preparar pipeline de IA

  LagrangeState.initialized = true;
  LagrangeState.lastSync = new Date();

  console.log(">> Sistema Lagrange ACTIVO");
  console.log(">> Modo: Fricción Ética Habilitada");
  
  return LagrangeState;
};

/**
 * Procesa input del usuario a través del pipeline socrático
 * @param {string} userInput - Texto del usuario
 * @returns {Object} Respuesta del Arquitecto
 */
export const processUserInput = async (userInput) => {
  if (!LagrangeState.initialized) {
    throw new Error("Sistema Lagrange no inicializado");
  }

  console.log(`>> Procesando input: "${userInput.substring(0, 50)}..."`);

  // Pipeline de procesamiento
  const pipeline = {
    // 1. Análisis de eje dominante
    axis: detectDominantAxis(userInput),
    
    // 2. Cálculo de tensión actual
    tension: calculateTension(userInput),
    
    // 3. Generación de respuesta socrática
    response: null,
    
    // 4. Validación de fricción
    isValid: false,
  };

  // TODO: Implementar generación de respuesta con IA
  // TODO: Validar contra el Primer Mandamiento
  // TODO: Registrar en narrativeMatrix

  // Registrar interacción
  LagrangeState.userInteractions.push({
    input: userInput,
    axis: pipeline.axis,
    tension: pipeline.tension,
    timestamp: new Date(),
  });

  return pipeline;
};

/**
 * Detecta el eje temático dominante en el input
 * @param {string} input - Texto a analizar
 * @returns {string} Eje detectado
 */
const detectDominantAxis = (input) => {
  const axisKeywords = {
    Miedo: ['miedo', 'terror', 'pánico', 'ansiedad', 'temor', 'asustado'],
    Control: ['control', 'poder', 'dominio', 'autoridad', 'obediencia', 'reglas'],
    SaludMental: ['depresión', 'ansiedad', 'terapia', 'psicólogo', 'medicación', 'locura'],
    Legitimidad: ['verdad', 'mentira', 'credibilidad', 'confianza', 'autoridad', 'experto'],
    Responsabilidad: ['culpa', 'responsable', 'consecuencia', 'pagar', 'víctima', 'daño'],
  };

  const inputLower = input.toLowerCase();
  let maxScore = 0;
  let dominantAxis = 'Miedo'; // Default

  for (const [axis, keywords] of Object.entries(axisKeywords)) {
    const score = keywords.filter(kw => inputLower.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      dominantAxis = axis;
    }
  }

  return dominantAxis;
};

/**
 * Calcula el nivel de tensión del input
 * @param {string} input - Texto a analizar
 * @returns {number} Nivel de tensión (0-1)
 */
const calculateTension = (input) => {
  // Indicadores de alta tensión
  const tensionIndicators = [
    '?', '!', '...', 'por qué', 'cómo', 'quién',
    'siempre', 'nunca', 'nadie', 'todos',
  ];

  const inputLower = input.toLowerCase();
  let tension = 0.5; // Base

  for (const indicator of tensionIndicators) {
    if (inputLower.includes(indicator)) {
      tension += 0.05;
    }
  }

  // Longitud del input aumenta tensión
  if (input.length > 200) tension += 0.1;
  if (input.length > 500) tension += 0.1;

  return Math.min(tension, 1.0);
};

/**
 * Obtiene el estado actual del sistema
 */
export const getSystemState = () => ({
  ...LagrangeState,
  interactionCount: LagrangeState.userInteractions.length,
  averageTension: LagrangeState.userInteractions.length > 0
    ? LagrangeState.userInteractions.reduce((sum, i) => sum + i.tension, 0) / LagrangeState.userInteractions.length
    : 0,
});

/**
 * Ejecuta la primera "ingesta de realidad"
 * Verifica que el sistema responde correctamente
 */
export const runDiagnostic = async () => {
  console.log(">> Ejecutando diagnóstico del sistema...");

  const testInputs = [
    "Tengo miedo de perder mi trabajo",
    "¿Quién decide lo que es normal?",
    "Me siento controlado por el sistema",
  ];

  const results = [];

  for (const input of testInputs) {
    const result = await processUserInput(input);
    results.push({
      input,
      axis: result.axis,
      tension: result.tension,
    });
  }

  console.log(">> Diagnóstico completado:");
  console.table(results);

  return results;
};
