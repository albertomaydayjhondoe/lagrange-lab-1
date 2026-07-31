/**
 * Feature Flags - Academia Lexis MVP
 * 
 * Controla qué módulos están activos vs. en modo placeholder "Próximamente".
 * Cambiar los valores en .env para activar/desactivar módulos.
 */

export const FEATURE_FLAGS = {
  podcast: import.meta.env.VITE_FEATURE_PODCAST === 'true',
  topologia: import.meta.env.VITE_FEATURE_TOPOLOGIA === 'true',
  research: import.meta.env.VITE_FEATURE_RESEARCH === 'true',
  pitagoras: import.meta.env.VITE_FEATURE_PITAGORAS === 'true',
  tutoriasTutor: import.meta.env.VITE_FEATURE_TUTORIAS_TUTOR === 'true',
  adminAvanzado: import.meta.env.VITE_FEATURE_ADMIN_AVANZADO === 'true',
} as const;

export type FeatureName = keyof typeof FEATURE_FLAGS;

/**
 * Verifica si una feature está habilitada
 */
export function isFeatureEnabled(name: FeatureName): boolean {
  return FEATURE_FLAGS[name] ?? false;
}

/**
 * Lista de módulos fuera de scope del MVP
 * Estos se muestran como placeholders "Próximamente"
 */
export const OUT_OF_SCOPE_MODULES = [
  { key: 'podcast', label: 'Podcast Educativo', description: 'Generador de narrativas y radio ambiental' },
  { key: 'topologia', label: 'Topología del Conocimiento', description: 'Mapa interactivo de conceptos' },
  { key: 'research', label: 'Research Lab', description: 'Laboratorio de investigación académica' },
  { key: 'pitagoras', label: 'Pitágoras Lab', description: 'Laboratorio de matemáticas avanzadas' },
  { key: 'tutoriasTutor', label: 'Tutorías con Tutor Humano', description: 'Sesiones con tutores especializados' },
  { key: 'adminAvanzado', label: 'Panel de Administración', description: 'Gestión avanzada de la academia' },
] as const;
