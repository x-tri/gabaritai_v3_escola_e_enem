#!/bin/bash
# Script para configurar variáveis de ambiente do GPT Vision

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🔑 Configuração GPT Vision - Variáveis de Ambiente   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$BASE_DIR/.env"

# Verificar se .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

# Função para ler valor com máscara
read_secret() {
    local prompt="$1"
    local var_name="$2"
    local current_value=""
    
    # Tentar ler valor atual do .env
    if grep -q "^${var_name}=" "$ENV_FILE"; then
        current_value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    fi
    
    if [ -n "$current_value" ] && [ "$current_value" != "" ]; then
        echo ""
        echo "📋 Valor atual encontrado: ${current_value:0:10}... (oculto)"
        read -p "Deseja alterar? (s/N): " alterar
        if [[ ! "$alterar" =~ ^[Ss]$ ]]; then
            echo "$var_name=$current_value"
            return
        fi
    fi
    
    echo ""
    read -sp "$prompt: " value
    echo ""
    
    if [ -z "$value" ]; then
        echo "⚠️  Valor vazio, mantendo como está"
        if [ -n "$current_value" ]; then
            echo "$var_name=$current_value"
        else
            echo "$var_name="
        fi
    else
        echo "$var_name=$value"
    fi
}

echo "📝 Preencha as informações abaixo (ou pressione Enter para pular)"
echo ""

# Ler OPENAI_API_KEY
API_KEY=$(read_secret "🔑 Digite sua OPENAI_API_KEY (sk-...)" "OPENAI_API_KEY")

# Ler OPENAI_ASSISTANT_ID
ASSISTANT_ID=$(read_secret "🤖 Digite seu OPENAI_ASSISTANT_ID (asst_...)" "OPENAI_ASSISTANT_ID")

# Atualizar arquivo .env
echo ""
echo "📝 Atualizando arquivo .env..."

# Backup do arquivo original
cp "$ENV_FILE" "$ENV_FILE.backup"

# Atualizar OPENAI_API_KEY
if [ -n "$API_KEY" ]; then
    if grep -q "^OPENAI_API_KEY=" "$ENV_FILE"; then
        sed -i.bak "s|^OPENAI_API_KEY=.*|$API_KEY|" "$ENV_FILE"
    else
        echo "$API_KEY" >> "$ENV_FILE"
    fi
fi

# Atualizar OPENAI_ASSISTANT_ID
if [ -n "$ASSISTANT_ID" ]; then
    if grep -q "^OPENAI_ASSISTANT_ID=" "$ENV_FILE"; then
        sed -i.bak "s|^OPENAI_ASSISTANT_ID=.*|$ASSISTANT_ID|" "$ENV_FILE"
    else
        echo "$ASSISTANT_ID" >> "$ENV_FILE"
    fi
fi

# Remover arquivos .bak do sed
rm -f "$ENV_FILE.bak"

echo ""
echo "✅ Arquivo .env atualizado com sucesso!"
echo ""
echo "📋 Resumo das configurações:"
grep -E "^OPENAI_API_KEY=|^OPENAI_ASSISTANT_ID=" "$ENV_FILE" | sed 's/=.*/=***/' || echo "  (nenhuma variável configurada)"
echo ""
echo "🔄 Próximo passo: Reinicie o servidor para carregar as novas variáveis"
echo "   pkill -f 'tsx server/index.ts' && npm run dev"
echo ""

