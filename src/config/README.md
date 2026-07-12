# src/config - Active Configuration

**Estado**: Documentación filosofíca, no código activo.

## Archivos

### `Lagrange_Architect_Prompt_v2.md`
El **prompt madre** del sistema. Define:
- Primer Mandamiento (Neutralización del Miedo)
- Reglas de Anti-Terapia, Anti-Política, Fricción Obligatoria
- Los 5 Ejes de Tensión
- Protocolo de Respuesta
- Métricas de Éxito

**Uso**: Este archivo es la fuente única de verdad para el tono y reglas del sistema. Se replica en:
- `supabase/functions/_shared/architectPrompt.ts` (código)
- Todos los system prompts de las edge functions de IA

**Para actualizar**: Editar este archivo y luego regenerar `architectPrompt.ts`.

## Por qué no se importa

Este directorio contiene documentación y configuración filosófica. El código activo está:
- Edge functions en `supabase/functions/`
- Hooks en `src/hooks/`
- Servicios en `src/utils/`

## Archivos eliminados

### `Lagrange_IO_Director.js` (ELIMINADO)
**Razón**: Funcionalidad cubierta por `src/utils/interactionService.ts`.

El IO_Director tenía TODOs sin resolver y su funcionalidad de:
- Registrar interacciones ✅ `interactionService.saveInteraction()`
- Detectar eje dominante ✅ (lógica en componentes)
- Calcular tensión ✅ (interactionService con tensionLevel)
- Gestionar estado de sesión ✅ (Supabase + sessionStorage)

Ya estaba implementada en el pipeline existente.

## Fecha de limpieza
2024-07 - Unificación del Architect Prompt como fuente única de verdad.
