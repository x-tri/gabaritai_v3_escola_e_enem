#!/bin/bash
# =============================================================================
# 🟢 DEPLOY VERCEL - Migração Completa do Fly.io
# =============================================================================
# Deploy do GabaritAI no Vercel (Frontend + API)
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              🟢 DEPLOY VERCEL - GABARITAI                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Vercel CLI...${NC}"
    npm install -g vercel
fi

# Verificar se está logado
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Fazendo login no Vercel...${NC}"
    vercel login
fi

echo -e "${BLUE}📋 Iniciando deploy para Vercel...${NC}"
echo ""

# Deploy do projeto completo
echo -e "${YELLOW}🚀 Fazendo deploy...${NC}"
vercel --prod --yes

# Capturar URL do deploy
DEPLOY_URL=$(vercel --prod 2>&1 | grep -o 'https://[^ ]*\.vercel\.app')

if [ -n "$DEPLOY_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Deploy concluído!${NC}"
    echo -e "${GREEN}🌐 URL: $DEPLOY_URL${NC}"
    echo ""
    echo -e "${BLUE}📝 PRÓXIMOS PASSOS:${NC}"
    echo ""
    echo "1. Configure as variáveis de ambiente no dashboard do Vercel:"
    echo "   • SUPABASE_URL"
    echo "   • SUPABASE_ANON_KEY"
    echo "   • SUPABASE_SERVICE_KEY"
    echo "   • OPENAI_API_KEY"
    echo "   • PYTHON_OMR_URL (apontar para Railway/Render)"
    echo "   • PYTHON_TRI_URL (apontar para Railway/Render)"
    echo ""
    echo "2. Para os serviços Python, use Railway ou Render:"
    echo "   ./deploy_railway.sh"
    echo ""
    echo "3. Teste o acesso: $DEPLOY_URL"
else
    echo -e "${RED}❌ Erro no deploy. Verifique os logs acima.${NC}"
fi