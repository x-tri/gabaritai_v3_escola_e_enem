#!/bin/bash
# ============================================================
# 🛑 PARAR TODOS OS SERVIÇOS - GABARIT-AI X-TRI
# ============================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           🛑 GABARIT-AI X-TRI - Parando Serviços           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Parar OMR (5002)
echo "🔍 Parando OMR Definitivo (5002)..."
lsof -ti:5002 | xargs kill -9 2>/dev/null && echo "  ✅ OMR parado" || echo "  ⚪ OMR não estava rodando"

# Parar TRI (5003)
echo "📊 Parando TRI V2 (5003)..."
lsof -ti:5003 | xargs kill -9 2>/dev/null && echo "  ✅ TRI parado" || echo "  ⚪ TRI não estava rodando"

# Parar Backend (8080)
echo "🌐 Parando Backend (8080)..."
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "  ✅ Backend parado" || echo "  ⚪ Backend não estava rodando"

echo ""
echo "✅ Todos os serviços foram encerrados!"
echo ""

