#!/bin/bash
# =============================================================================
# 🚫 REMOVER GABARITAI DO FLY.IO - Migração para Local
# =============================================================================
# Este script remove todos os serviços do Fly.io e configura para rodar localmente
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🚫 REMOVENDO GABARITAI DO FLY.IO                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se flyctl está instalado
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl não encontrado. Instale primeiro:${NC}"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

echo -e "${YELLOW}📋 Apps que serão removidos:${NC}"
echo "   • xtri-gabaritos-api (Backend principal)"
echo "   • xtri-gabaritos-omr (Serviço OMR)"
echo "   • xtri-gabaritos-tri (Serviço TRI)"
echo ""

read -p "Tem certeza que deseja continuar? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Operação cancelada.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  Removendo apps do Fly.io...${NC}"

# Remover apps
flyctl apps destroy xtri-gabaritos-api --yes 2>/dev/null && echo -e "   ${GREEN}✅ xtri-gabaritos-api removido${NC}" || echo -e "   ${RED}❌ Erro ao remover xtri-gabaritos-api${NC}"
flyctl apps destroy xtri-gabaritos-omr --yes 2>/dev/null && echo -e "   ${GREEN}✅ xtri-gabaritos-omr removido${NC}" || echo -e "   ${RED}❌ Erro ao remover xtri-gabaritos-omr${NC}"
flyctl apps destroy xtri-gabaritos-tri --yes 2>/dev/null && echo -e "   ${GREEN}✅ xtri-gabaritos-tri removido${NC}" || echo -e "   ${RED}❌ Erro ao remover xtri-gabaritos-tri${NC}"

echo ""
echo -e "${GREEN}✅ Remoção do Fly.io concluída!${NC}"
echo ""
echo -e "${BLUE}📝 PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. Configure o .env para localhost:"
echo -e "   ${YELLOW}PYTHON_OMR_URL=http://localhost:5002${NC}"
echo -e "   ${YELLOW}PYTHON_TRI_URL=http://localhost:5003${NC}"
echo ""
echo "2. Inicie os serviços localmente:"
echo -e "   ${YELLOW}./start_all.sh${NC}"
echo ""
echo "3. Teste o acesso:"
echo -e "   ${YELLOW}http://localhost:8080${NC}"
echo ""
echo -e "${GREEN}🎉 Migração concluída! Agora tudo roda localmente.${NC}"