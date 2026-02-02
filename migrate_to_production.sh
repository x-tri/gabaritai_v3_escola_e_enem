#!/bin/bash
# =============================================================================
# 🔄 MIGRAÇÃO COMPLETA: FLY.IO → PRODUÇÃO
# =============================================================================
# Migra todo o GabaritAI do Fly.io para provedores de produção modernos
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🔄 MIGRAÇÃO: FLY.IO → PRODUÇÃO MODERNA               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🎯 ESTRATÉGIA RECOMENDADA:${NC}"
echo ""
echo "   🟢 VERCEL     → Frontend + API Node.js"
echo "   🟠 RAILWAY    → Serviços Python (OMR + TRI)"
echo "   🟡 SUPABASE   → Banco (já está em produção)"
echo ""
echo -e "${BLUE}💰 CUSTO MENSAL: ~$10-20 (muito menos que Fly.io)${NC}"
echo ""

read -p "Continuar com esta estratégia? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Migração cancelada.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  PASSO 1: Removendo do Fly.io...${NC}"

# Remover do Fly.io
flyctl apps destroy xtri-gabaritos-api --yes 2>/dev/null && echo -e "   ${GREEN}✅ API removida${NC}" || echo -e "   ${RED}❌ Erro na API${NC}"
flyctl apps destroy xtri-gabaritos-omr --yes 2>/dev/null && echo -e "   ${GREEN}✅ OMR removido${NC}" || echo -e "   ${RED}❌ Erro no OMR${NC}"
flyctl apps destroy xtri-gabaritos-tri --yes 2>/dev/null && echo -e "   ${GREEN}✅ TRI removido${NC}" || echo -e "   ${RED}❌ Erro no TRI${NC}"

echo ""
echo -e "${YELLOW}🚀 PASSO 2: Deploy no Vercel (Frontend + API)...${NC}"

# Deploy Vercel
if command -v vercel &> /dev/null; then
    vercel --prod --yes
    VERCEL_URL=$(vercel --prod 2>&1 | grep -o 'https://[^ ]*\.vercel\.app' | tail -1)
    echo -e "   ${GREEN}✅ Vercel: $VERCEL_URL${NC}"
else
    echo -e "   ${RED}❌ Vercel CLI não encontrado${NC}"
    echo -e "   ${YELLOW}Execute: npm i -g vercel && vercel login${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 PASSO 3: Deploy Railway (Serviços Python)...${NC}"

# Deploy Railway
if command -v railway &> /dev/null; then
    # OMR
    cd python_omr_service
    railway init --name "gabaritai-omr" --yes 2>/dev/null || echo "OMR já existe"
    railway up
    cd ..

    # TRI
    cd python_tri_service
    railway init --name "gabaritai-tri" --yes 2>/dev/null || echo "TRI já existe"
    railway up
    cd ..

    echo -e "   ${GREEN}✅ Serviços Python no Railway${NC}"
else
    echo -e "   ${RED}❌ Railway CLI não encontrado${NC}"
    echo -e "   ${YELLOW}Execute: curl -fsSL https://railway.app/install.sh | sh${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 MIGRAÇÃO CONCLUÍDA!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 RESUMO DA MUDANÇA:${NC}"
echo ""
echo -e "   ❌ ANTES (Fly.io):"
echo -e "      • 3 apps separados"
echo -e "      • $50-100/mês"
echo -e "      • Configuração complexa"
echo ""
echo -e "   ✅ DEPOIS (Vercel + Railway):"
echo -e "      • Frontend: $VERCEL_URL"
echo -e "      • $10-20/mês"
echo -e "      • Setup moderno e simples"
echo ""
echo -e "${YELLOW}🔧 CONFIGURAÇÕES PENDENTES:${NC}"
echo ""
echo "1. No Vercel Dashboard, configure:"
echo "   • PYTHON_OMR_URL=https://gabaritai-omr.railway.app"
echo "   • PYTHON_TRI_URL=https://gabaritai-tri.railway.app"
echo "   • SUPABASE_URL e chaves"
echo ""
echo "2. Teste o acesso: $VERCEL_URL"
echo ""
echo "3. Configure domains customizados se necessário"
echo ""
echo -e "${BLUE}💡 Suporte: vercel.com/docs | railway.app/docs${NC}"