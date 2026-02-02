#!/bin/bash
# =============================================================================
# 🟠 DEPLOY RAILWAY - Serviços Python
# =============================================================================
# Deploy dos serviços OMR e TRI no Railway
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            🟠 DEPLOY RAILWAY - SERVIÇOS PYTHON             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Railway CLI...${NC}"
    curl -fsSL https://railway.app/install.sh | sh
    export PATH="$HOME/.railway/bin:$PATH"
fi

# Login
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Fazendo login no Railway...${NC}"
    railway login
fi

echo -e "${BLUE}📋 Fazendo deploy dos serviços Python...${NC}"
echo ""

# Deploy OMR Service
echo -e "${YELLOW}🔍 Deploying OMR Service...${NC}"
cd python_omr_service
railway init --name "gabaritai-omr" --yes 2>/dev/null || echo "Projeto já existe"
railway up
OMR_URL=$(railway domain 2>/dev/null || echo "Configure domain no dashboard")
cd ..

echo ""
echo -e "${YELLOW}📊 Deploying TRI Service...${NC}"
cd python_tri_service
railway init --name "gabaritai-tri" --yes 2>/dev/null || echo "Projeto já existe"
railway up
TRI_URL=$(railway domain 2>/dev/null || echo "Configure domain no dashboard")
cd ..

echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo -e "${BLUE}🔗 URLs dos serviços:${NC}"
echo "   OMR: $OMR_URL"
echo "   TRI: $TRI_URL"
echo ""
echo -e "${BLUE}📝 Configure estas URLs no Vercel:${NC}"
echo "   PYTHON_OMR_URL=$OMR_URL"
echo "   PYTHON_TRI_URL=$TRI_URL"
echo ""
echo -e "${YELLOW}💡 Dica: Configure as domains no dashboard do Railway${NC}"