#!/bin/bash
# ================================================================
# DEPLOY SCRIPT: Lagrange Lab → GitHub Pages
# ================================================================
#
# Uso:
#   npm run deploy:ghpages
#
# Este script:
#   1. Hace build para GitHub Pages (con base path /lagrange-lab-1/)
#   2. Copia los archivos de github-pages/ al dist/
#   3. Despliega usando gh-pages
# ================================================================

set -e

echo "🚀 Lagrange Lab - Deploy to GitHub Pages"
echo "=============================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "📋 Paso 1: Verificando configuración..."
echo "   Proyecto: lagrange-lab-1"
echo "   Framework: Vite + React + TypeScript"
echo "   Base path: /lagrange-lab-1/"

echo ""
echo "🔧 Paso 2: Haciendo build para GitHub Pages..."
npm run build:ghpages

echo ""
echo "📁 Paso 3: Copiando archivos de github-pages/ a dist/..."
if [ -d "github-pages" ]; then
  cp -r github-pages/* dist/
  echo "   ✅ Archivos copiados"
else
  echo -e "   ${YELLOW}⚠️ Directorio github-pages/ no encontrado${NC}"
fi

echo ""
echo "🌐 Paso 4: Desplegando a GitHub Pages..."
npm run deploy:ghpages

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deploy completado${NC}"
echo "=============================================="
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verifica el deployment en GitHub Pages"
echo "   2. La URL será: https://albertomaydayjhondoe.github.io/lagrange-lab-1/"
echo ""
