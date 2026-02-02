#!/bin/bash
# =============================================================================
# 🔄 ATUALIZAR .ENV PARA LOCALHOST
# =============================================================================
# Configura as variáveis de ambiente para usar serviços locais ao invés do Fly.io
# =============================================================================

echo "🔄 Atualizando .env para localhost..."

# Backup do arquivo atual
cp .env .env.fly.backup 2>/dev/null && echo "📋 Backup criado: .env.fly.backup"

# Atualizar URLs dos serviços Python
sed -i '' 's|https://xtri-gabaritos-omr.fly.dev|http://localhost:5002|g' .env
sed -i '' 's|https://xtri-gabaritos-tri.fly.dev|http://localhost:5003|g' .env

echo "✅ .env atualizado para localhost!"
echo ""
echo "📝 Verificações:"
echo "   PYTHON_OMR_URL=http://localhost:5002"
echo "   PYTHON_TRI_URL=http://localhost:5003"