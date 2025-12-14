#!/bin/bash

# Script para iniciar o servidor GabaritAI com o diretório correto

# Obtém o diretório onde este script está localizado
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Iniciando GabaritAI..."
echo "📁 Diretório do projeto: $SCRIPT_DIR"

# Navega para o diretório do projeto
cd "$SCRIPT_DIR" || exit 1

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules não encontrado. Instalando dependências..."
    npm install
fi

# Inicia o servidor
echo "🔥 Iniciando servidor em http://localhost:8080"
npm run dev
