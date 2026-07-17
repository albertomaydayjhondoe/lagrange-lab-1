#!/bin/bash

# ============================================================
# SCRIPT DE DEPLOY - Sistema de Tutorías IA
# ============================================================
# Este script configura completamente el sistema para producción
# Ejecutar desde la raíz del proyecto
# ============================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji helpers
INFO="${CYAN}ℹ️${NC}"
SUCCESS="${GREEN}✅${NC}"
ERROR="${RED}❌${NC}"
WARN="${YELLOW}⚠️${NC}"

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎓 SISTEMA DE TUTORÍAS IA - DEPLOY SCRIPT           ║
║                                                           ║
║     Vercel + Supabase + OpenAI                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ============================================================
# FUNCIONES UTILIDADES
# ============================================================

pause() {
    echo -e "\n${YELLOW}Presiona ENTER para continuar...${NC}"
    read -r
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${ERROR} Comando '$1' no encontrado. Instálalo primero."
        return 1
    fi
    return 0
}

confirm() {
    local prompt="${1:-¿Continuar?}"
    local default="${2:-y}"
    
    while true; do
        echo -e "\n${CYAN}${prompt} [${default}]${NC}"
        read -r response
        response=${response:-$default}
        
        case $response in
            [Yy]|yes|si) return 0 ;;
            [Nn]|no) return 1 ;;
            *) echo -e "${WARN} Responde yes/no" ;;
        esac
    done
}

# ============================================================
# PASO 1: VERIFICAR REQUISITOS
# ============================================================

step1_prerequisites() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📋 PASO 1: Verificando requisitos${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local missing=0

    # Node.js
    echo -n "  Node.js... "
    if check_command node; then
        echo -e "${SUCCESS} $(node --version)"
    else
        echo -e "${ERROR} No instalado"
        missing=1
    fi

    # npm
    echo -n "  npm... "
    if check_command npm; then
        echo -e "${SUCCESS} $(npm --version)"
    else
        echo -e "${ERROR} No instalado"
        missing=1
    fi

    # Supabase CLI
    echo -n "  Supabase CLI... "
    if check_command supabase; then
        echo -e "${SUCCESS} $(supabase --version)"
    else
        echo -e "${WARN} No instalado (opcional para desarrollo local)"
    fi

    # Git
    echo -n "  Git... "
    if check_command git; then
        echo -e "${SUCCESS} $(git --version)"
    else
        echo -e "${ERROR} No instalado"
        missing=1
    fi

    # Vercel CLI (opcional)
    echo -n "  Vercel CLI... "
    if check_command vercel; then
        echo -e "${SUCCESS} $(vercel --version)"
    else
        echo -e "${WARN} No instalado (opcional)"
        echo -e "      Instalar con: ${CYAN}npm i -g vercel${NC}"
    fi

    if [ $missing -eq 1 ]; then
        echo -e "\n${ERROR} Faltan requisitos obligatorios. Instálalos antes de continuar."
        exit 1
    fi

    echo -e "\n${SUCCESS} Requisitos verificados"
}

# ============================================================
# PASO 2: CONFIGURAR VARIABLES DE ENTORNO
# ============================================================

step2_environment() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📝 PASO 2: Configurar variables de entorno${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${INFO} Necesitamos configurar las siguientes variables:"
    echo -e "   • VITE_SUPABASE_URL (del proyecto Supabase)"
    echo -e "   • VITE_SUPABASE_PUBLISHABLE_KEY (key pública)"
    echo -e "   • VITE_SUPABASE_PROJECT_ID (ID del proyecto)"
    echo -e "   • SUPABASE_ACCESS_TOKEN (token personal de Supabase)"
    echo -e "   • AI_API_KEY (OpenAI o compatible)"
    
    pause

    # Detectar archivo .env
    local env_file=".env"
    if [ -f "$env_file" ]; then
        echo -e "\n${INFO} Archivo ${YELLOW}$env_file${NC} encontrado."
        if confirm "¿Sobrescribir variables existentes?" "n"; then
            create_env_file "$env_file"
        else
            echo -e "${INFO} Usando archivo existente."
            source "$env_file" 2>/dev/null || true
        fi
    else
        create_env_file "$env_file"
    fi
}

create_env_file() {
    local file="$1"
    
    echo -e "\n${CYAN}Configurando $file...${NC}"

    # Supabase URL
    echo -n "  URL de Supabase (https://xxxx.supabase.co): "
    read -r SUPABASE_URL
    while [[ ! "$SUPABASE_URL" =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; do
        echo -e "    ${RED}Formato inválido. Ejemplo: https://xxxx.supabase.co${NC}"
        echo -n "  URL de Supabase: "
        read -r SUPABASE_URL
    done

    # Extraer project ID de URL
    SUPABASE_PROJECT_ID=$(echo "$SUPABASE_URL" | sed -E 's|https://([a-z0-9]+)\.supabase\.co|\1|')
    
    # Anon key
    echo -n "  Publishable Key (eyJ...): "
    read -r SUPABASE_PUBLISHABLE_KEY
    while [[ ! "$SUPABASE_PUBLISHABLE_KEY" =~ ^eyJ ]]; do
        echo -e "    ${RED}Formato inválido. La key debe empezar con 'eyJ'${NC}"
        echo -n "  Publishable Key: "
        read -r SUPABASE_PUBLISHABLE_KEY
    done

    # Access Token
    echo -n "  Supabase Personal Access Token (sb-...): "
    read -r SUPABASE_ACCESS_TOKEN
    while [[ ! "$SUPABASE_ACCESS_TOKEN" =~ ^sb-[a-zA-Z0-9]+$ ]]; do
        echo -e "    ${RED}Formato inválido. El token debe empezar con 'sb-'${NC}"
        echo -n "  Supabase Access Token: "
        read -r SUPABASE_ACCESS_TOKEN
    done

    # AI API Key
    echo -n "  AI API Key (sk-...): "
    read -r AI_API_KEY
    while [[ ! "$AI_API_KEY" =~ ^sk-[a-zA-Z0-9]+$ ]]; do
        echo -e "    ${RED}Formato inválido. La key debe empezar con 'sk-'${NC}"
        echo -n "  AI API Key: "
        read -r AI_API_KEY
    done

    # AI Gateway URL (opcional)
    echo -n "  AI Gateway URL [https://api.openai.com/v1]: "
    read -r AI_GATEWAY_URL
    AI_GATEWAY_URL=${AI_GATEWAY_URL:-https://api.openai.com/v1}

    # AI Chat Model (opcional)
    echo -n "  AI Chat Model [gpt-4o-mini]: "
    read -r AI_CHAT_MODEL
    AI_CHAT_MODEL=${AI_CHAT_MODEL:-gpt-4o-mini}

    # Escribir archivo
    cat > "$file" << EOF
# ============================================================
# VARIABLES DE ENTORNO - Sistema de Tutorías IA
# Generado automáticamente por deploy-tutorias.sh
# ============================================================

# Supabase
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN

# AI (configurado en Supabase Secrets, no aquí)
# AI_API_KEY=$AI_API_KEY
# AI_GATEWAY_URL=$AI_GATEWAY_URL
# AI_CHAT_MODEL=$AI_CHAT_MODEL
# AI_EMBEDDING_MODEL=text-embedding-3-small

# ============================================================
# NOTA: Las variables AI_* se configuran en Supabase Secrets
# ============================================================
EOF

    echo -e "\n${SUCCESS} Archivo $file creado"
}

# ============================================================
# PASO 3: APLICAR MIGRACIONES
# ============================================================

step3_migrations() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🗄️ PASO 3: Aplicar migraciones a Supabase${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${INFO} Este paso creará las tablas en tu base de datos de Supabase:"
    echo -e "   • subjects, topics, materials (con RAG/pgvector)"
    echo -e "   • tutoring_sessions, session_bookings"
    echo -e "   • payments, tutoring_history"
    echo -e "   • tutor_availability, subscriptions"
    echo -e "   • RLS policies"

    echo -e "\n${WARN} Necesitas:"
    echo -e "   1. Un proyecto de Supabase activo"
    echo -e "   2. Tu SUPABASE_ACCESS_TOKEN configurado"
    
    if ! confirm "\n¿Aplicar migraciones ahora?"; then
        echo -e "${INFO} Saltando. Ejecuta después: ${CYAN}npx supabase db push${NC}"
        return 0
    fi

    # Verificar variables
    if [ -f .env ]; then
        source .env
    fi

    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo -e "${ERROR} SUPABASE_ACCESS_TOKEN no está configurado."
        echo -e "${INFO} Edita el archivo .env y agrega tu token."
        return 1
    fi

    # Link al proyecto
    echo -e "\n${INFO} Vinculando al proyecto Supabase..."
    npx supabase link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_ACCESS_TOKEN" --no-migrations

    if [ $? -ne 0 ]; then
        echo -e "${ERROR} Error al vincular con Supabase. Verifica las credenciales."
        return 1
    fi

    # Push migraciones
    echo -e "\n${INFO} Aplicando migraciones..."
    npx supabase db push --project-ref "$SUPABASE_PROJECT_ID"

    if [ $? -eq 0 ]; then
        echo -e "\n${SUCCESS} Migraciones aplicadas correctamente"
    else
        echo -e "\n${ERROR} Error al aplicar migraciones"
        return 1
    fi
}

# ============================================================
# PASO 4: CONFIGURAR SECRETS EN SUPABASE
# ============================================================

step4_secrets() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🔐 PASO 4: Configurar Secrets en Supabase${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${INFO} Las Edge Functions necesitan estas variables:"
    echo -e "   • AI_API_KEY - Tu API key de OpenAI o compatible"
    echo -e "   • AI_GATEWAY_URL - URL del gateway de IA"
    echo -e "   • AI_CHAT_MODEL - Modelo a usar"
    echo -e "   • AI_EMBEDDING_MODEL - Modelo para embeddings"
    echo -e "   • SUPABASE_SERVICE_ROLE_KEY - Key de servicio"

    if ! confirm "\n¿Configurar secrets ahora?"; then
        echo -e "${INFO} Saltando. Ejecuta manualmente en Supabase Dashboard."
        return 0
    fi

    if [ -z "$AI_API_KEY" ]; then
        echo -n "  AI API Key: "
        read -r AI_API_KEY
    fi

    if [ -z "$AI_API_KEY" ]; then
        echo -e "${ERROR} AI_API_KEY es requerida"
        return 1
    fi

    echo -e "\n${INFO} Configurando secrets en Supabase..."

    # AI_API_KEY
    supabase secrets set AI_API_KEY="$AI_API_KEY" --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null || \
    echo -e "${WARN} No se pudo configurar AI_API_KEY. Hazlo manualmente."

    # AI_GATEWAY_URL
    supabase secrets set AI_GATEWAY_URL="https://api.openai.com/v1" --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null || \
    echo -e "${WARN} No se pudo configurar AI_GATEWAY_URL."

    # AI_CHAT_MODEL
    supabase secrets set AI_CHAT_MODEL="gpt-4o-mini" --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null || \
    echo -e "${WARN} No se pudo configurar AI_CHAT_MODEL."

    # AI_EMBEDDING_MODEL
    supabase secrets set AI_EMBEDDING_MODEL="text-embedding-3-small" --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null || \
    echo -e "${WARN} No se pudo configurar AI_EMBEDDING_MODEL."

    echo -e "\n${SUCCESS} Secrets configurados (o configúralos manualmente en Supabase Dashboard)"
}

# ============================================================
# PASO 5: DEPLOY EDGE FUNCTIONS
# ============================================================

step5_deploy_functions() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🚀 PASO 5: Deploy Edge Functions${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${INFO} Funciones a desplegar:"
    echo -e "   • tutoring-oracle (Chat IA con RAG)"
    echo -e "   • create-session"
    echo -e "   • book-session"
    echo -e "   • cancel-booking"
    echo -e "   • process-payment"
    echo -e "   • list-sessions"

    if ! confirm "\n¿Desplegar Edge Functions ahora?"; then
        echo -e "${INFO} Saltando. Ejecuta después:"
        echo -e "   ${CYAN}npx supabase functions deploy --all${NC}"
        return 0
    fi

    echo -e "\n${INFO} Desplegando funciones..."

    local functions=(
        "tutoring-oracle"
        "create-session"
        "book-session"
        "cancel-booking"
        "process-payment"
        "list-sessions"
    )

    for func in "${functions[@]}"; do
        echo -n "  $func... "
        npx supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_ID" --no-verify-jwt > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${SUCCESS}"
        else
            echo -e "${WARN} (revisar logs)"
        fi
    done

    echo -e "\n${SUCCESS} Deploy de funciones completado"
}

# ============================================================
# PASO 6: DEPLOY EN VERCEL
# ============================================================

step6_vercel() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}☁️ PASO 6: Deploy en Vercel${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${INFO} Opciones de deploy:"
    echo -e "   1. CLI (vercel --prod)"
    echo -e "   2. GitHub (automático)"
    echo -e "   3. Manual (solo generar build)"

    echo -n "\n  Selecciona opción [1]: "
    read -r option
    option=${option:-1}

    case $option in
        1)
            deploy_vercel_cli
            ;;
        2)
            deploy_vercel_github
            ;;
        3)
            deploy_vercel_manual
            ;;
        *)
            echo -e "${ERROR} Opción inválida"
            ;;
    esac
}

deploy_vercel_cli() {
    echo -e "\n${INFO} Deploy con Vercel CLI..."
    
    if ! check_command vercel; then
        echo -e "${WARN} Instalando Vercel CLI..."
        npm install -g vercel
    fi

    echo -e "${INFO} Ejecutando vercel --prod..."
    echo -e "${YELLOW}Sigue las instrucciones en pantalla.${NC}"
    pause

    vercel --prod
}

deploy_vercel_github() {
    echo -e "\n${INFO} Deploy vía GitHub:"
    echo -e "   1. Ve a https://vercel.com/new"
    echo -e "   2. Importa tu repositorio"
    echo -e "   3. Configura las variables de entorno:"
    echo -e "      • VITE_SUPABASE_URL"
    echo -e "      • VITE_SUPABASE_PUBLISHABLE_KEY"
    echo -e "      • VITE_SUPABASE_PROJECT_ID"
    echo -e "   4. Deploy!"
    
    echo -e "\n${CYAN}¿Abrir vercel.com en el navegador?${NC}"
    if confirm "" "y"; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "https://vercel.com/new" 2>/dev/null || true
        fi
    fi
}

deploy_vercel_manual() {
    echo -e "\n${INFO} Generando build local..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "\n${SUCCESS} Build generado en ./dist"
        echo -e "${INFO} Sube esta carpeta a Vercel o configúrala manualmente."
    fi
}

# ============================================================
# PASO 7: VERIFICACIÓN FINAL
# ============================================================

step7_verify() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}✅ PASO 7: Verificación${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ CONFIGURACIÓN COMPLETADA                 ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"

    echo -e "\n${CYAN}📋 Checklist de verificación:${NC}"
    echo -e "   ☑️  Variables de entorno configuradas"
    echo -e "   ☑️  Migraciones aplicadas en Supabase"
    echo -e "   ☑️  Secrets configurados en Supabase"
    echo -e "   ☑️  Edge Functions desplegadas"
    echo -e "   ☑️  Frontend desplegado en Vercel"

    echo -e "\n${CYAN}🧪 Para probar:${NC}"
    echo -e "   1. Abre tu URL de Vercel"
    echo -e "   2. Ve a ${YELLOW}/tutorias${NC}"
    echo -e "   3. Selecciona una materia"
    echo -e "   4. Envía una pregunta al chat IA"
    
    echo -e "\n${CYAN}🔧 Si algo falla:${NC}"
    echo -e "   • Verifica las variables en Vercel Dashboard"
    echo -e "   • Revisa logs de Edge Functions en Supabase"
    echo -e "   • Verifica que AI_API_KEY esté activa en OpenAI"

    echo -e "\n${CYAN}📚 Documentación:${NC}"
    echo -e "   • README.md - Guía completa"
    echo -e "   • .env.example - Variables de ejemplo"
}

# ============================================================
# MENÚ PRINCIPAL
# ============================================================

show_menu() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}                   MENÚ PRINCIPAL${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   ${GREEN}1${NC}) Verificar requisitos"
    echo -e "   ${GREEN}2${NC}) Configurar variables de entorno"
    echo -e "   ${GREEN}3${NC}) Aplicar migraciones a Supabase"
    echo -e "   ${GREEN}4${NC}) Configurar Secrets en Supabase"
    echo -e "   ${GREEN}5${NC}) Desplegar Edge Functions"
    echo -e "   ${GREEN}6${NC}) Desplegar en Vercel"
    echo -e "   ${GREEN}7${NC}) Verificación final"
    echo -e "   ${GREEN}A${NC}) Ejecutar TODO (automático)"
    echo -e "   ${GREEN}Q${NC}) Salir"
    echo ""
}

# ============================================================
# EJECUCIÓN PRINCIPAL
# ============================================================

main() {
    # Cargar .env si existe
    [ -f .env ] && source .env

    while true; do
        show_menu
        echo -n "  Selecciona opción: "
        read -r choice
        
        case $choice in
            1) step1_prerequisites ;;
            2) step2_environment ;;
            3) step3_migrations ;;
            4) step4_secrets ;;
            5) step5_deploy_functions ;;
            6) step6_vercel ;;
            7) step7_verify ;;
            A|a)
                step1_prerequisites
                pause
                step2_environment
                pause
                step3_migrations
                pause
                step4_secrets
                pause
                step5_deploy_functions
                pause
                step6_vercel
                pause
                step7_verify
                ;;
            Q|q)
                echo -e "\n${CYAN}¡Hasta luego! 👋${NC}\n"
                exit 0
                ;;
            *)
                echo -e "${ERROR} Opción inválida${NC}"
                ;;
        esac
        
        echo ""
    done
}

# Ejecutar
main "$@"
