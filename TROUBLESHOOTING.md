# 🔧 Guia de Resolução de Problemas

## Erro: ENOENT - Caminho Antigo `/Volumes/TRI/GABARITAI-FINAL`

### Causa
O Node.js está usando um caminho em cache que aponta para o local antigo do projeto.

### Solução Passo a Passo

#### **Opção 1: Usar o script de inicialização (RECOMENDADO)**

**macOS/Linux:**
```bash
cd "/Volumes/notebook/gabaritAI 2"
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
cd "C:\caminho\para\gabaritAI 2"
start.bat
```

---

#### **Opção 2: Limpeza Manual Completa**

```bash
# 1. Navegue para o diretório correto
cd "/Volumes/notebook/gabaritAI 2"

# 2. Verifique que está no lugar certo
pwd
# Deve mostrar: /Volumes/notebook/gabaritAI 2

# 3. Remova TODOS os arquivos em cache
rm -rf node_modules
rm -rf dist
rm -rf .vite
rm -rf .turbo
rm -rf .next
rm -rf .eslintcache
rm -f package-lock.json
rm -f tsconfig.tsbuildinfo
rm -f npm-debug.log*

# 4. Limpe cache do npm
npm cache clean --force

# 5. Limpe cache do tsx
npx tsx --clear

# 6. Reinstale dependências
npm install

# 7. Inicie o servidor
npm run dev
```

---

#### **Opção 3: Se ainda não funcionar**

Se o erro persistir mesmo após limpeza, o Node.js pode estar sendo executado de um contexto diferente.

1. **Verifique o erro detalhado:**
   ```bash
   npm run dev 2>&1 | tee error.log
   ```
   Abra `error.log` e procure por `[VITE]` para ver o caminho resolvido.

2. **Defina explicitamente o diretório:**
   ```bash
   cd "/Volumes/notebook/gabaritAI 2"
   NODE_ENV=development npx tsx server/index.ts
   ```

3. **Força rebuild completo:**
   ```bash
   npm run build
   npm run dev
   ```

---

## ✅ Verificação de Sucesso

Quando iniciar corretamente, você deve ver:

```
🔥 [servidor] serving on port 8080
[VITE] Resolved client template path: /Volumes/notebook/gabaritAI 2/client/index.html
```

E poderá acessar: **http://localhost:8080** ✅

---

## 📝 Checklist de Configuração

- [ ] Diretório correto: `/Volumes/notebook/gabaritAI 2`
- [ ] Node.js v16+: `node --version`
- [ ] npm instalado: `npm --version`
- [ ] Sem node_modules antigos
- [ ] Sem arquivos de cache
- [ ] `npm install` completado com sucesso
- [ ] Nenhum outro servidor rodando na porta 8080

---

## Informações Adicionais

**Arquivos modificados para resolver o problema:**
- `server/vite.ts` - Usa `process.cwd()` e `__dirname` como fallback
- `vite.config.ts` - Usa `process.cwd()` para paths

**Debug:** Se precisar de mais informações, o servidor agora exibe:
- Caminho resolvido do cliente
- Diretório de trabalho atual
- Erro detalhado se não conseguir encontrar os arquivos

---

**Ainda não funciona?** Compartilhe:
1. Resultado do comando `pwd` no terminal
2. Resultado do `npm run dev` (copie todo o output)
3. Estrutura de pastas: `ls -la /Volumes/notebook/gabaritAI\ 2/`
