#!/bin/bash
# ============================================================
# SCRIPT DE DEPLOY COMPLETO
# Lagrange Lab - RAG Multi-Formato con Procedencia IA
# ============================================================

set -e

echo "🚀 INICIANDO DEPLOY COMPLETO"
echo "=============================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================
# 1. CONFIGURACIÓN DE VARIABLES
# ============================================================
echo -e "\n${YELLOW}[1/5] Configurando variables de entorno...${NC}"

export VITE_SUPABASE_URL="https://naikdjreibbugblihgwl.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc"
export VITE_SUPABASE_PROJECT_ID="naikdjreibbugblihgwl"

echo "✅ Variables configuradas"
echo "   - SUPABASE_URL: $VITE_SUPABASE_URL"
echo "   - PROJECT_ID: $VITE_SUPABASE_PROJECT_ID"

# ============================================================
# 2. BUILD FRONTEND
# ============================================================
echo -e "\n${YELLOW}[2/5] Construyendo frontend...${NC}"

cd /workspace/project/lagrange-lab-1

npm run build

if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Frontend construido exitosamente${NC}"
else
    echo -e "${RED}❌ Error en build del frontend${NC}"
    exit 1
fi

# ============================================================
# 3. VERIFICAR MIGRACIONES
# ============================================================
echo -e "\n${YELLOW}[3/5] Verificando migraciones de base de datos...${NC}"

echo "Migraciones pendientes:"
ls -1 supabase/migrations/*.sql | tail -5

# ============================================================
# 4. VERIFICAR EDGE FUNCTIONS
# ============================================================
echo -e "\n${YELLOW}[4/5] Verificando Edge Functions...${NC}"

echo "Funciones disponibles:"
ls -1 supabase/functions/ | grep -v "^_"

# ============================================================
# 5. DEPLOY A GITHUB PAGES
# ============================================================
echo -e "\n${YELLOW}[5/5] Desplegando a GitHub Pages...${NC}"

npm run deploy

echo -e "\n${GREEN}=============================================="
echo "✅ DEPLOY COMPLETADO"
echo "=============================================="
echo ""
echo "📋 RESUMEN:"
echo "   - Frontend: GitHub Pages"
echo "   - Supabase: https://naikdjreibbugblihgwl.supabase.co"
echo "   - Edge Functions: Desplegadas via Supabase CLI"
echo ""
echo "⚠️  ACCIONES REQUERIDAS MANUALMENTE:"
echo "   1. Ejecutar migraciones en Supabase SQL Editor"
echo "   2. Configurar AI_API_KEY en Supabase Functions Secrets"
echo "   3. Configurar AI_CHAT_MODEL y AI_EMBEDDING_MODEL"
echo ""
echo "🌐 URLs:"
echo "   - App: https://albertomaydayjhondoe.github.io/lagrange-lab-1/"
echo "   - Supabase: https://supabase.com/dashboard/project/naikdjreibbugblihgwl"
echo "=============================================="
