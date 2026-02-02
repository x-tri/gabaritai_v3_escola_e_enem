#!/bin/bash
# =============================================================================
# 🔄 MIGRAÇÃO COMPLETA: FLY.IO → LOCAL
# =============================================================================
# Script completo para migrar todo o GabaritAI do Fly.io para localhost
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🔄 MIGRAÇÃO COMPLETA: FLY.IO → LOCALHOST              ║"
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

echo -e "${YELLOW}📋 Esta migração irá:${NC}"
echo "   1. Remover apps do Fly.io"
echo "   2. Atualizar .env para localhost"
echo "   3. Iniciar serviços locais"
echo "   4. Testar funcionamento"
echo ""

read -p "Continuar com a migração completa? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Migração cancelada.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  PASSO 1: Removendo apps do Fly.io...${NC}"

# Remover apps do Fly.io
flyctl apps destroy xtri-gabaritos-api --yes 2>/dev/null && echo -e "   ${GREEN}✅ xtri-gabaritos-api removido${NC}" || echo -e "   ${RED}❌ Erro ao remover xtri-gabaritos-api${NC}"
flyctl apps destroy xtri-gabaritos-omr --yes 2>/dev/null && echo -e "   ${GREEN}✅ xtri-gabaritos-omr removido${NC}" || echo -e "   ${RED}❌ Erro ao remover xtri-gabaritos-omr${NC}"
flyctl apps destroy xtri-gabaritos-tri --yes 2>/dev/null && echo -e "   ${GREEN}✅ xtri-gabaritos-tri removido${NC}" || echo -e "   ${RED}❌ Erro ao remover xtri-gabaritos-tri${NC}"

echo ""
echo -e "${YELLOW}🔄 PASSO 2: Atualizando configuração para localhost...${NC}"

# Backup e atualização do .env
cp .env .env.fly.backup 2>/dev/null && echo -e "   ${GREEN}✅ Backup criado: .env.fly.backup${NC}"

sed -i '' 's|https://xtri-gabaritos-omr.fly.dev|http://localhost:5002|g' .env
sed -i '' 's|https://xtri-gabaritos-tri.fly.dev|http://localhost:5003|g' .env
echo -e "   ${GREEN}✅ .env atualizado para localhost${NC}"

echo ""
echo -e "${YELLOW}🚀 PASSO 3: Iniciando serviços locais...${NC}"

# Iniciar serviços locais
if [ -f "start_all.sh" ]; then
    chmod +x start_all.sh 2>/dev/null
    ./start_all.sh
else
    echo -e "   ${RED}❌ start_all.sh não encontrado${NC}"
    echo -e "   ${YELLOW}Execute manualmente: ./start_all.sh${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                🎉 MIGRAÇÃO CONCLUÍDA!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Acesse: http://localhost:8080${NC}"
echo ""
echo -e "${YELLOW}💡 Para verificar se tudo está funcionando:${NC}"
echo "   curl http://localhost:8080"
echo "   curl http://localhost:5002/health"
echo "   curl http://localhost:5003/health"