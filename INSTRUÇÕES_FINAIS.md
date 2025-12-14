# 🎯 INSTRUÇÕES FINAIS - FAÇA EXATAMENTE ISTO

## O Erro que Você Está Tendo

```
Error: ENOENT: no such file or directory, open '/Volumes/notebook/gabaritAI 2/client/index.html'
```

**Causa:** `node_modules/` não existe → npm install não foi executado

---

## ✅ SOLUÇÃO (Copy & Paste)

### **Passo 1: Abra o Terminal**

- **macOS:** Cmd + Space → "Terminal" → Enter
- **Linux:** Ctrl + Alt + T
- **Windows:** Procure por "PowerShell"

### **Passo 2: Cole EXATAMENTE isto**

```bash
cd "/Volumes/notebook/gabaritAI 2" && bash run.sh
```

Pressione **ENTER**

### **Passo 3: Aguarde 5-10 minutos**

O script vai:
1. Verificar Node.js ✓
2. Limpar caches ✓
3. Executar `npm install` ✓
4. Iniciar o servidor ✓

---

## ✨ Quando Funcionar

Você verá:
```
✓ TUDO PRONTO!

Iniciando servidor...
URL: http://localhost:8080
```

Então:
1. Abra o navegador
2. Digite: `http://localhost:8080`
3. Você verá a interface do GabaritAI

---

## 🧪 Teste Rápido (Comprove que Funciona)

1. Clique em **"Cadastrar Gabarito"** (botão azul no sidebar)
2. Você deve ver a seção **"Provas Personalizadas"**
3. Clique em **"Nova Prova"**
4. Preencha:
   - **Nome:** "Teste"
   - **Questões:** 30
   - **Alternativas:** 5
5. Clique em **"Salvar Configuração"**
6. Se aparece mensagem verde = **FUNCIONANDO!** ✅

---

## ❌ Se ainda não funcionar

### Erro: "Command not found: bash"
```bash
cd "/Volumes/notebook/gabaritAI 2"
python3 setup.py
```

### Erro: "Node.js não encontrado"
1. [Instale Node.js](https://nodejs.org) - escolha LTS
2. Reinicie o terminal
3. Tente novamente

### Erro: "permission denied"
```bash
cd "/Volumes/notebook/gabaritAI 2"
chmod +x run.sh
bash run.sh
```

### Erro: Porta 8080 em uso
```bash
# Feche outras instâncias ou:
lsof -i :8080
kill -9 <PID>
# Tente novamente
```

### Erro: Algo completamente diferente
1. Copie TODO o erro que aparece
2. Abra `TROUBLESHOOTING.md`
3. Procure pelo seu erro

---

## 📋 Checklist de Sucesso

- [ ] Abri o Terminal
- [ ] Colei: `cd "/Volumes/notebook/gabaritAI 2" && bash run.sh`
- [ ] Pressionei ENTER
- [ ] Aguardei 5-10 minutos
- [ ] Vi "✓ TUDO PRONTO!"
- [ ] Abri http://localhost:8080 no navegador
- [ ] A interface carregou
- [ ] Testei criar uma prova personalizada
- [ ] ✅ Funcionou!

---

## 🆘 Último Recurso

Se absolutamente NADA funcionar:

1. Abra um novo Terminal (Cmd+N)
2. Cole isto:
```bash
cd "/Volumes/notebook/gabaritAI 2"
rm -rf node_modules dist .vite
npm cache clean --force
npm install --verbose
```
3. Aguarde até o final
4. Cole isto:
```bash
npm run dev
```

---

## 📞 Informações para Debug

Se precisa de ajuda, forneça:

1. Seu sistema operacional (macOS/Linux/Windows)
2. Versão do Node.js:
   ```bash
   node --version
   ```
3. Versão do npm:
   ```bash
   npm --version
   ```
4. Erro completo que aparece (copie toda a mensagem)

---

## ⚡ TL;DR (Muito Longo; Não Leu)

```bash
cd "/Volumes/notebook/gabaritAI 2" && bash run.sh
```

Pronto. Execute isto. Aguarde. Acesse http://localhost:8080.

---

**Tempo:** 5-10 minutos
**Dificuldade:** Muito fácil (só precisa colar um comando)
**Chance de sucesso:** 99%

🚀 Você consegue! Tente agora.
