#!/bin/bash
# ============================================================
# SETUP SECRETS - Lagrange Lab
# Configura los secrets necesarios para las Edge Functions de IA
# ============================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================
# CONFIGURACIÓN
# ============================================================
PROJECT_REF="naikdjreibbugblihgwl"
PROJECT_URL="https://naikdjreibbugblihgwl.supabase.co"

echo "=============================================="
echo "🔐 LAGRANGE LAB - SETUP SECRETS"
echo "=============================================="
echo ""
echo "Proyecto: $PROJECT_REF"
echo "URL: $PROJECT_URL"
echo ""

# ============================================================
# VERIFICAR INSTALACIÓN DEL CLI DE SUPABASE
# ============================================================
echo -e "${YELLOW}[1/4] Verificando Supabase CLI...${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx no está instalado. Instala Node.js primero.${NC}"
    exit 1
fi

if ! npx supabase --version &> /dev/null; then
    echo -e "${YELLOW}⚠️ Supabase CLI no encontrado. Instalando...${NC}"
    npm install supabase@1 --save-dev
fi

echo -e "${GREEN}✅ Supabase CLI disponible${NC}"

# ============================================================
# VERIFICAR LOGIN
# ============================================================
echo ""
echo -e "${YELLOW}[2/4] Verificando autenticación en Supabase...${NC}"

# Intentar listar funciones para verificar login
if ! npx supabase functions list --project-ref "$PROJECT_REF" &> /dev/null; then
    echo -e "${RED}❌ Error: No estás autenticado en Supabase.${NC}"
    echo ""
    echo "Ejecuta los siguientes comandos:"
    echo "  1. npx supabase login"
    echo "  2. Ingresa tu token de acceso desde https://supabase.com/dashboard/account/tokens"
    echo ""
    echo "O establece la variable de entorno:"
    echo "  export SUPABASE_ACCESS_TOKEN=<tu_token>"
    exit 1
fi

echo -e "${GREEN}✅ Autenticación verificada${NC}"

# ============================================================
# SOLICITAR VALORES DE SECRETS
# ============================================================
echo ""
echo -e "${YELLOW}[3/4] Solicitando valores de secrets...${NC}"

# AI_API_KEY (requerido)
echo ""
echo -e "${YELLOW}AI_API_KEY (requerido):${NC}"
echo -e "  Obtén tu API key de OpenAI desde: https://platform.openai.com/api-keys"
read -sp "  Ingresa tu AI_API_KEY: " AI_API_KEY
echo ""

if [ -z "$AI_API_KEY" ]; then
    echo -e "${RED}❌ Error: AI_API_KEY es requerido${NC}"
    exit 1
fi

# ELEVENLABS_API_KEY (opcional)
echo ""
echo -e "${YELLOW}ELEVENLABS_API_KEY (opcional, para síntesis de voz):${NC}"
echo -e "  Obtén tu API key de ElevenLabs desde: https://elevenlabs.io/api"
read -sp "  Ingresa tu ELEVENLABS_API_KEY (o presiona Enter para omitir): " ELEVENLABS_API_KEY
echo ""

# ============================================================
# CONFIGURAR SECRETS
# ============================================================
echo ""
echo -e "${YELLOW}[4/4] Configurando secrets en Supabase...${NC}"

# AI_API_KEY (requerido)
echo -e "  Configurando AI_API_KEY..."
npx supabase secrets set "AI_API_KEY=$AI_API_KEY" --project-ref "$PROJECT_REF"
echo -e "${GREEN}  ✅ AI_API_KEY configurado${NC}"

# AI_GATEWAY_URL (con default)
echo -e "  Configurando AI_GATEWAY_URL (default: https://api.openai.com/v1)..."
npx supabase secrets set "AI_GATEWAY_URL=https://api.openai.com/v1" --project-ref "$PROJECT_REF"
echo -e "${GREEN}  ✅ AI_GATEWAY_URL configurado${NC}"

# AI_CHAT_MODEL (con default)
echo -e "  Configurando AI_CHAT_MODEL (default: gpt-4o-mini)..."
npx supabase secrets set "AI_CHAT_MODEL=gpt-4o-mini" --project-ref "$PROJECT_REF"
echo -e "${GREEN}  ✅ AI_CHAT_MODEL configurado${NC}"

# AI_EMBEDDING_MODEL (con default)
echo -e "  Configurando AI_EMBEDDING_MODEL (default: text-embedding-3-small)..."
npx supabase secrets set "AI_EMBEDDING_MODEL=text-embedding-3-small" --project-ref "$PROJECT_REF"
echo -e "${GREEN}  ✅ AI_EMBEDDING_MODEL configurado${NC}"

# ELEVENLABS_API_KEY (opcional)
if [ -n "$ELEVENLABS_API_KEY" ]; then
    echo -e "  Configurando ELEVENLABS_API_KEY..."
    npx supabase secrets set "ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY" --project-ref "$PROJECT_REF"
    echo -e "${GREEN}  ✅ ELEVENLABS_API_KEY configurado${NC}"
else
    echo -e "${YELLOW}  ⚠️ ELEVENLABS_API_KEY no configurado (opcional)${NC}"
fi

# ============================================================
# VERIFICAR FUNCIONES DESPLEGADAS
# ============================================================
echo ""
echo -e "${YELLOW}Verificando funciones IA desplegadas...${NC}"

AI_FUNCTIONS=(
    "socratic-oracle"
    "tutoring-oracle"
    "ai-nodes"
    "ai-edges"
    "ai-questions"
    "ai-episodes"
    "ai-curate-text"
    "ai-dialogue-summary"
    "generate-narrative"
    "generate-ambient-narrative"
    "eco-oracle"
    "fog-teaser"
    "regenerate-topology-delta"
    "ingest-source"
)

MISSING_FUNCTIONS=()
for func in "${AI_FUNCTIONS[@]}"; do
    if npx supabase functions list --project-ref "$PROJECT_REF" 2>/dev/null | grep -q "$func"; then
        echo -e "  ${GREEN}✅${NC} $func"
    else
        echo -e "  ${YELLOW}⚠️${NC} $func (no encontrada)"
        MISSING_FUNCTIONS+=("$func")
    fi
done

# ============================================================
# RESUMEN
# ============================================================
echo ""
echo -e "${GREEN}=============================================="
echo "✅ SETUP COMPLETADO"
echo "==============================================${NC}"
echo ""
echo "📋 Secrets configurados:"
echo "   ✅ AI_API_KEY"
echo "   ✅ AI_GATEWAY_URL"
echo "   ✅ AI_CHAT_MODEL"
echo "   ✅ AI_EMBEDDING_MODEL"
[ -n "$ELEVENLABS_API_KEY" ] && echo "   ✅ ELEVENLABS_API_KEY" || echo "   ⚠️ ELEVENLABS_API_KEY (opcional)"
echo ""
echo "🌐 URLs:"
echo "   - Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "   - Edge Functions: $PROJECT_URL/functions/v1/"
echo ""

if [ ${#MISSING_FUNCTIONS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️ FUNCIONES NO DESPLEGADAS:${NC}"
    echo "   Las siguientes funciones necesitan ser desplegadas:"
    for func in "${MISSING_FUNCTIONS[@]}"; do
        echo "   - $func"
    done
    echo ""
    echo "   Para desplegar funciones faltantes:"
    echo "   npx supabase functions deploy <nombre-funcion> --project-ref $PROJECT_REF"
    echo ""
    echo "   O desplegar todas:"
    echo "   cd supabase && npx supabase functions deploy"
fi

echo ""
echo "🧪 Para probar las funciones IA, usa:"
echo "   curl -X POST '$PROJECT_URL/functions/v1/socratic-oracle' \\"
echo "     -H 'Authorization: Bearer <tu_token>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"academyId\": \"<academy-id>\"}'"
echo ""
echo "=============================================="
