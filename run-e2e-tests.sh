#!/bin/bash

echo "🚀 Iniciando testes E2E do GabaritAI..."

# Iniciar servidor de teste em background
echo "📡 Iniciando servidor de teste..."
node test-server.js &
SERVER_PID=$!

echo "🔍 PID do servidor: $SERVER_PID"

# Aguardar servidor iniciar completamente
echo "⏳ Aguardando servidor ficar pronto..."
sleep 10

# Verificar se servidor está respondendo
echo "🔍 Verificando se servidor está respondendo..."
if curl -s --max-time 5 http://localhost:5173/ > /dev/null; then
    echo "✅ Servidor está respondendo!"
else
    echo "❌ Servidor não está respondendo"
    echo "📋 Verificando processos..."
    ps aux | grep node
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Executar testes
echo "🧪 Executando testes E2E..."
npx playwright test e2e/basic.spec.ts --project=chromium --timeout=10000

# Matar servidor
kill $SERVER_PID 2>/dev/null

echo "✅ Testes finalizados!""