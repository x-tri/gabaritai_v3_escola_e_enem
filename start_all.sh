#!/bin/bash
# ============================================================
# 🚀 INICIALIZAÇÃO AUTOMÁTICA - GABARIT-AI X-TRI
# ============================================================
# Execute este script para iniciar todos os serviços necessários
# Uso: ./start_all.sh
# ============================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           🚀 GABARIT-AI X-TRI - Iniciando Serviços         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

# Função para verificar se porta está em uso
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Função para matar processo em porta
kill_port() {
    lsof -ti:$1 | xargs kill -9 2>/dev/null
}

echo -e "${BLUE}📍 Diretório: $BASE_DIR${NC}"
echo ""

# ============================================================
# 1. OMR DEFINITIVO (Porta 5002)
# ============================================================
echo -e "${YELLOW}[1/3] 🔍 Iniciando OMR Definitivo (porta 5002)...${NC}"
if check_port 5002; then
    echo -e "  ${GREEN}✅ OMR já está rodando na porta 5002${NC}"
else
    kill_port 5002
    cd "$BASE_DIR/python_omr_service"
    python3 app.py > /dev/null 2>&1 &
    sleep 2
    if check_port 5002; then
        echo -e "  ${GREEN}✅ OMR Definitivo iniciado com sucesso!${NC}"
    else
        echo -e "  ${RED}❌ Erro ao iniciar OMR Definitivo${NC}"
    fi
fi

# ============================================================
# 2. TRI V2 (Porta 5003)
# ============================================================
echo -e "${YELLOW}[2/3] 📊 Iniciando TRI V2 (porta 5003)...${NC}"
if check_port 5003; then
    echo -e "  ${GREEN}✅ TRI V2 já está rodando na porta 5003${NC}"
else
    kill_port 5003
    cd "$BASE_DIR/python_tri_service"
    # Ativar venv se existir
    if [ -d "venv" ]; then
        source venv/bin/activate 2>/dev/null
    fi
    python3 app.py > /dev/null 2>&1 &
    sleep 2
    if check_port 5003; then
        echo -e "  ${GREEN}✅ TRI V2 iniciado com sucesso!${NC}"
    else
        echo -e "  ${RED}❌ Erro ao iniciar TRI V2${NC}"
    fi
fi

# ============================================================
# 3. BACKEND + FRONTEND (Porta 8080)
# ============================================================
echo -e "${YELLOW}[3/3] 🌐 Iniciando Backend + Frontend (porta 8080)...${NC}"
if check_port 8080; then
    echo -e "  ${GREEN}✅ Backend já está rodando na porta 8080${NC}"
else
    kill_port 8080
    cd "$BASE_DIR"
    npm run dev > /dev/null 2>&1 &
    sleep 4
    if check_port 8080; then
        echo -e "  ${GREEN}✅ Backend + Frontend iniciados com sucesso!${NC}"
    else
        echo -e "  ${RED}❌ Erro ao iniciar Backend${NC}"
    fi
fi

# ============================================================
# VERIFICAÇÃO FINAL
# ============================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    📋 STATUS FINAL                          ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

# Verificar cada serviço
echo ""
echo -n "  🔍 OMR Definitivo (5002): "
if curl -s http://localhost:5002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Online${NC}"
else
    echo -e "${RED}❌ Offline${NC}"
fi

echo -n "  📊 TRI V2 (5003):         "
if curl -s http://localhost:5003/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Online${NC}"
else
    echo -e "${RED}❌ Offline${NC}"
fi

echo -n "  🌐 Backend (8080):        "
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Online${NC}"
else
    echo -e "${RED}❌ Offline${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       🎉 Acesse: http://localhost:8080                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

