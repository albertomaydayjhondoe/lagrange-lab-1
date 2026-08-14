#!/bin/bash
# ============================================================
# DEPLOY EXTERNAL RESEARCH FUNCTION
# Despliega la nueva función de Wikipedia fallback
# ============================================================

set -e

PROJECT_REF="${SUPABASE_PROJECT_ID:-${VITE_SUPABASE_PROJECT_ID:-}}"
PROJECT_URL="${VITE_SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Falta SUPABASE_PROJECT_ID (o VITE_SUPABASE_PROJECT_ID)."
  echo "   Exporta tu propio ref: export SUPABASE_PROJECT_ID=tu-project-ref"
  exit 1
fi

echo "🚀 DEPLOY EXTERNAL RESEARCH FUNCTION"
echo "=============================================="

# Verificar que supabase CLI está disponible
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx no está instalado"
    exit 1
fi

# Verificar login
echo "Verificando autenticación..."
if ! npx supabase functions list --project-ref "$PROJECT_REF" &> /dev/null; then
    echo "❌ No estás autenticado en Supabase"
    echo ""
    echo "Ejecuta: npx supabase login"
    echo "Luego ingresa tu token desde: https://supabase.com/dashboard/account/tokens"
    exit 1
fi

echo "✅ Autenticación verificada"

# Desplegar external-research
echo ""
echo "Desplegando external-research..."
cd supabase
npx supabase functions deploy external-research --project-ref "$PROJECT_REF"

# Desplegar funciones actualizadas
echo ""
echo "Desplegando socratic-oracle actualizado..."
npx supabase functions deploy socratic-oracle --project-ref "$PROJECT_REF"

echo ""
echo "Desplegando tutoring-oracle actualizado..."
npx supabase functions deploy tutoring-oracle --project-ref "$PROJECT_REF"

echo ""
echo "=============================================="
echo "✅ DEPLOY COMPLETADO"
echo "=============================================="
echo ""
echo "Funciones desplegadas:"
echo "   - external-research"
echo "   - socratic-oracle"
echo "   - tutoring-oracle"
echo ""
echo "Para probar:"
echo "   curl -X POST '$PROJECT_URL/functions/v1/external-research' \\"
echo "     -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"question\": \"¿Qué es la ética en filosofía?\", \"language\": \"es\"}'"
echo ""
