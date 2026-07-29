#!/bin/bash
# ================================================================
# DEPLOY SCRIPT: Lagrange Lab → Vercel Production
# ================================================================
#
# Uso:
#   1. Configure Vercel CLI: vercel login
#   2. Configure variables de entorno en Vercel Dashboard
#   3. Ejecute: ./deploy-vercel.sh
#
# Variables de entorno requeridas en Vercel Dashboard:
#   VITE_SUPABASE_URL=https://naikdjreibbugblihgwl.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ZeZ0R4rQpNbvhEfHMjtQrQ_BrjDJXrc
#   VITE_SUPABASE_PROJECT_ID=naikdjreibbugblihgwl
# ================================================================

set -e

echo "🚀 Lagrange Lab - Deploy to Vercel Production"
echo "=============================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI no está instalado"
    echo "   Instalando..."
    npm install -g vercel
fi

echo ""
echo "📋 Paso 1: Verificando configuración..."
echo "   Proyecto: lagrange-lab-1"
echo "   Framework: Vite + React + TypeScript"
echo "   Supabase Project: naikdjreibbugblihgwl"

echo ""
echo "🔧 Paso 2: Configurando variables de entorno..."
echo "   Asegúrate de configurar en Vercel Dashboard:"
echo "   • VITE_SUPABASE_URL"
echo "   • VITE_SUPABASE_PUBLISHABLE_KEY"
echo "   • VITE_SUPABASE_PROJECT_ID"

echo ""
echo "🌐 Paso 3: Desplegando a Vercel..."
echo ""

# Deploy a producción
echo "   Ejecutando: vercel --prod --yes"
vercel --prod --yes

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deploy completado${NC}"
echo "=============================================="
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verifica el deployment en Vercel Dashboard"
echo "   2. Configura variables de entorno si no están"
echo "   3. Prueba la aplicación"
echo ""
