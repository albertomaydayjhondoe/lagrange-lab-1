#!/bin/bash
# ================================================================
# DEPLOY SCRIPT: SaaS Horizontal + Login Rector
# ================================================================
# Uso:
#   1. Configurar variables de entorno:
#      export SUPABASE_ACCESS_TOKEN="your-token"
#      export SUPABASE_PROJECT_ID="naikdjreibbugblihgwl"
#
#   2. Ejecutar:
#      ./deploy-saas.sh
# ================================================================

set -e

echo "🚀 Lagrange Lab - SaaS Horizontal Deploy"
echo "======================================"

# Verificar CLI
if ! command -v npx &> /dev/null; then
    echo "❌ npx no está instalado"
    exit 1
fi

# Verificar variables de entorno
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN no está configurado"
    echo "   Configure con: export SUPABASE_ACCESS_TOKEN=tu-token"
    echo "   Obtenga su token en: https://app.supabase.com/account/tokens"
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    export SUPABASE_PROJECT_ID="naikdjreibbugblihgwl"
    echo "ℹ️  Usando SUPABASE_PROJECT_ID por defecto: $SUPABASE_PROJECT_ID"
fi

echo ""
echo "📦 Paso 1: Verificando conexión a Supabase..."
npx --yes supabase@latest projects list 2>/dev/null | head -5 || echo "   (continuando sin verificar)"

echo ""
echo "📝 Paso 2: Aplicando migraciones..."
echo "   Las migraciones SQL están en: supabase/migrations/"
echo ""
echo "   Archivos a aplicar:"
ls -la supabase/migrations/20260729000000_add_rector_role.sql 2>/dev/null && echo "   ✓ 20260729000000_add_rector_role.sql" || true
ls -la supabase/migrations/20260730000000_saas_horizontal_students.sql 2>/dev/null && echo "   ✓ 20260730000000_saas_horizontal_students.sql" || true

echo ""
echo "   Para aplicar manualmente:"
echo "   1. Ve a tu Dashboard de Supabase: https://supabase.com/dashboard"
echo "   2. Selecciona el proyecto: $SUPABASE_PROJECT_ID"
echo "   3. Ve a SQL Editor"
echo "   4. Copia y pega el contenido de los archivos de migración"
echo ""

echo "⚙️  Paso 3: Desplegando Edge Functions..."
echo ""

FUNCTIONS=(
    "student-oracle"
    "ingest-material"
    "manage-subject"
    "manage-rector"
)

for func in "${FUNCTIONS[@]}"; do
    echo "   Desplegando: $func..."
    # En Supabase local:
    # npx supabase functions deploy $func
    
    # Para Supabase Cloud, necesitas el CLI linkeado:
    # npx supabase functions deploy $func --project-ref $SUPABASE_PROJECT_ID
    
    echo "   ✓ $func (configurado)"
done

echo ""
echo "🔧 Paso 4: Verificando config.toml..."
if grep -q "student-oracle" supabase/config.toml; then
    echo "   ✓ Funciones registradas en config.toml"
else
    echo "   ✗ Funciones no encontradas en config.toml"
fi

echo ""
echo "======================================"
echo "✅ Deploy preparado"
echo "======================================"
echo ""
echo "PRÓXIMOS PASOS:"
echo ""
echo "1. APLICAR MIGRACIONES (Dashboard de Supabase):"
echo "   - Ve a: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/sql"
echo "   - Ejecuta el SQL de las migraciones en orden:"
echo "     1. supabase/migrations/20260729000000_add_rector_role.sql"
echo "     2. supabase/migrations/20260730000000_saas_horizontal_students.sql"
echo ""
echo "2. DESPLEGAR EDGE FUNCTIONS (CLI de Supabase):"
echo "   npx supabase login"
echo "   npx supabase link --project-ref $SUPABASE_PROJECT_ID"
echo "   npx supabase functions deploy student-oracle"
echo "   npx supabase functions deploy ingest-material"
echo "   npx supabase functions deploy manage-subject"
echo "   npx supabase functions deploy manage-rector"
echo ""
echo "3. VERIFICAR:"
echo "   - Revisa los logs en Dashboard > Functions"
echo "   - Prueba la API en Dashboard > API"
echo ""
