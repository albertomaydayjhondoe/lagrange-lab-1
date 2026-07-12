# Legacy Data - Archive

**Estado**: Solo para seed inicial en nuevas instalaciones.

## Contenido

### `/topology/`
- `nodes.json` - Semilla de nodos topológicos
- `edges.json` - Semilla de aristas
- `socratic_questions.json` - Preguntas socráticas iniciales

**Uso**: Estos archivos se usan SOLO durante el setup inicial de una nueva instalación para poblar la base de datos. En runtime, todos los datos vienen de Supabase (`topology_nodes`, `topology_edges`, `socratic_questions`).

### `/corpus/`
- `miedo_al_miedo.me` - Narrativa sobre el eje Miedo
- `legitimidad_y_silencio.me` - Narrativa sobre el eje Legitimidad  
- `critica_socratica_lagrange.me` - Marco filosófico general

**Uso**: Estos archivos se parsean mediante `supabase/functions/sync-corpus` para poblar la tabla `corpus_fragments` en Supabase. Una vez sync'd, los datos viven en la base de datos.

## Por qué están aquí

Estos archivos fueron la semilla original del Sistema Lagrange. Ahora el sistema es "vivo":
- La topología se genera y modifica mediante `ai-nodes` y `ai-edges`
- Las preguntas socráticas se generan mediante `ai-questions`
- El corpus narrativo se usa como contexto para generación de IA

## Scripts de Setup

Para usar estos archivos en una nueva instalación:

```bash
# 1. Deploy edge functions
supabase functions deploy sync-corpus

# 2. Sync corpus fragments
curl -X POST https://your-project.supabase.co/functions/v1/sync-corpus \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# 3. Import topology (usar Admin panel o script)
```

## Fecha de archivado
2024-07 - Migración a arquitectura viva con Supabase como fuente única de verdad.
