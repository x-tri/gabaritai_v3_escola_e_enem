#!/bin/bash

echo "════════════════════════════════════════════════════"
echo "  Matando processo na porta 8080 e reiniciando..."
echo "════════════════════════════════════════════════════"
echo ""

# Matar qualquer processo na porta 8080
echo "1. Limpando porta 8080..."
if lsof -i :8080 > /dev/null 2>&1; then
    PID=$(lsof -t -i :8080)
    echo "   ✓ Encontrado PID: $PID"
    kill -9 $PID 2>/dev/null || true
    echo "   ✓ Processo encerrado"
    sleep 2
else
    echo "   ✓ Porta 8080 já está livre"
fi

echo ""
echo "2. Reiniciando servidor..."
echo ""

# Executar run.sh
bash run.sh
