#!/bin/bash

echo "🔍 Procurando por processos na porta 8080..."

# macOS/Linux
if lsof -i :8080 > /dev/null 2>&1; then
    echo "✓ Encontrado processo na porta 8080"
    echo "Encerrando..."

    # Obter PID
    PID=$(lsof -t -i :8080)

    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo "✓ Processo $PID encerrado"
    fi
else
    echo "✓ Nenhum processo encontrado na porta 8080"
fi

echo ""
echo "Você pode agora executar: bash run.sh"
