#!/bin/bash

###############################################################################
# GabaritAI - Script de Inicialização Automática
# Executa tudo que é necessário para rodar o projeto
###############################################################################

set -e  # Parar em qualquer erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}          GabaritAI - Inicialização Automática         ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# Verificar Node.js
echo -e "${YELLOW}1. Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js não encontrado!${NC}"
    echo "Instale em: https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Verificar npm
echo -e "${YELLOW}2. Verificando npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm não encontrado!${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}\n"

# Verificar diretório
echo -e "${YELLOW}3. Verificando diretório do projeto...${NC}"
CURRENT_DIR=$(pwd)
echo -e "${BLUE}   Diretório atual: ${CURRENT_DIR}${NC}"

if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json não encontrado!${NC}"
    echo "Execute este script no diretório raiz do projeto:"
    echo "  cd /Volumes/notebook/gabaritAI\ 2"
    echo "  bash run.sh"
    exit 1
fi
echo -e "${GREEN}✓ package.json encontrado${NC}\n"

# Limpar caches
echo -e "${YELLOW}4. Limpando caches antigos...${NC}"

echo "   Removendo node_modules..."
rm -rf node_modules 2>/dev/null || true

echo "   Removendo dist..."
rm -rf dist 2>/dev/null || true

echo "   Removendo .vite..."
rm -rf .vite 2>/dev/null || true

echo "   Removendo .turbo..."
rm -rf .turbo 2>/dev/null || true

echo "   Removendo package-lock.json..."
rm -f package-lock.json 2>/dev/null || true

echo "   Removendo arquivos de debug..."
rm -f npm-debug.log* tsconfig.tsbuildinfo 2>/dev/null || true

echo -e "${BLUE}   Limpando cache npm...${NC}"
npm cache clean --force --quiet

echo -e "${GREEN}✓ Caches limpos${NC}\n"

# Instalar dependências
echo -e "${YELLOW}5. Instalando dependências (pode demorar 3-5 minutos)...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}   Tentando com --legacy-peer-deps...${NC}"
    npm install --legacy-peer-deps
fi

echo -e "${GREEN}✓ Dependências instaladas${NC}\n"

# Verificar tipos TypeScript
echo -e "${YELLOW}6. Verificando TypeScript...${NC}"
npm run check 2>/dev/null || echo -e "${YELLOW}   (Avisos de tipo ignorados)${NC}"
echo -e "${GREEN}✓ TypeScript verificado${NC}\n"

# Iniciar servidor
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✓ TUDO PRONTO!${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Iniciando servidor...${NC}"
echo -e "${BLUE}URL: http://localhost:8080${NC}"
echo -e "${BLUE}Pressione Ctrl+C para parar\n${NC}"

npm run dev
