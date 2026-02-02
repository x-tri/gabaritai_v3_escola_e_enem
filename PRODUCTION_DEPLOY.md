# 🚀 Produção - Alternativas ao Fly.io

## 🎯 Estratégia Recomendada

Para **produção moderna e econômica**, recomendamos:

```
🟢 VERCEL     → Frontend + API Node.js
🟠 RAILWAY    → Serviços Python (OMR + TRI)
🟡 SUPABASE   → Banco de dados (já em produção)
```

**Custo mensal: $10-20** (vs $50-100 no Fly.io)

## 📋 Scripts de Migração

### Migração Completa Automática
```bash
./migrate_to_production.sh
```

**Faz tudo automaticamente:**
- ✅ Remove apps do Fly.io
- ✅ Deploy no Vercel (frontend + API)
- ✅ Deploy no Railway (serviços Python)
- ✅ Mostra URLs finais

### Migração Manual

#### 1. Deploy Vercel (Frontend + API)
```bash
./deploy_vercel.sh
```

#### 2. Deploy Railway (Serviços Python)
```bash
./deploy_railway.sh
```

#### 3. Configurar Variáveis
No dashboard do Vercel, configure:
```
PYTHON_OMR_URL=https://gabaritai-omr.railway.app
PYTHON_TRI_URL=https://gabaritai-tri.railway.app
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
OPENAI_API_KEY=...
```

## 🆚 Comparação de Provedores

| Provedor | Custo/mês | Vantagens | Desvantagens |
|----------|-----------|-----------|--------------|
| **Vercel** | $0-20 | • Deploy automático<br>• CDN global<br>• Preview deployments | • API limitada a 10s |
| **Railway** | $5-15 | • Full-stack<br>• PostgreSQL incluído<br>• Docker support | • Menos CDN |
| **Render** | $7-25 | • Bom custo<br>• Free tier | • Deploy mais lento |
| **Fly.io** | $50-100+ | • Global<br>• Baixa latência | • Caro<br>• Complexo |

## 🔧 Configurações Técnicas

### Vercel (vercel.json)
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ]
}
```

### Railway (railway.toml)
```toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
restartPolicyType = "ON_FAILURE"
```

## 📊 Custos Detalhados

### Estratégia Recomendada ($10-20/mês)
- **Vercel**: $0-20 (hobby/pro plan)
- **Railway**: $5-10 (hobby plan)
- **Supabase**: $0-25 (depende do uso)

### Fly.io Atual ($50-100/mês)
- **API**: ~$30/mês
- **OMR**: ~$20/mês
- **TRI**: ~$20/mês
- **Transferência**: ~$10-30/mês

## 🚀 Próximos Passos

1. **Execute a migração:**
   ```bash
   ./migrate_to_production.sh
   ```

2. **Configure variáveis no Vercel**

3. **Teste todas as funcionalidades**

4. **Configure domínio customizado (opcional)**

## 📞 Suporte

- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Railway**: [railway.app/docs](https://railway.app/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)

## 💡 Dicas

- **Monitoramento**: Use os dashboards de cada provedor
- **Backup**: Supabase já faz backup automático
- **Escalabilidade**: Todos os provedores escalam automaticamente
- **Domains**: Configure domains customizados nos dashboards</content>
<parameter name="filePath">/Volumes/Kingston/apps/gabaritAI 2/PRODUCTION_DEPLOY.md