# ⚡ Quick Start - Comandos Diretos

## Para macOS/Linux (Copie e cole no Terminal)

```bash
# Copy this entire command block and paste it:

cd "/Volumes/notebook/gabaritAI 2" && \
rm -rf node_modules dist .vite npm-debug.log tsconfig.tsbuildinfo && \
npm cache clean --force && \
npm install && \
npm run dev
```

Isso fará:
1. ✅ Navegar para o diretório correto
2. ✅ Limpar todos os caches
3. ✅ Reinstalar dependências
4. ✅ Iniciar o servidor

O servidor deve abrir em: **http://localhost:8080**

---

## Para Windows (PowerShell ou CMD)

### PowerShell:
```powershell
cd "C:\caminho\para\gabaritAI 2"; `
rm -r -Force node_modules -ErrorAction SilentlyContinue; `
rm -r -Force dist -ErrorAction SilentlyContinue; `
npm cache clean --force; `
npm install; `
npm run dev
```

### CMD:
```cmd
cd "C:\caminho\para\gabaritAI 2"
rmdir /s /q node_modules
rmdir /s /q dist
npm cache clean --force
npm install
npm run dev
```

---

## Verificação Rápida

Se ver isso na console:
```
🔥 [servidor] serving on port 8080
[VITE] Resolved client template path: /Volumes/notebook/gabaritAI 2/client/index.html
```

✅ **Funcionando!**

Acesse: **http://localhost:8080**

---

## Se ainda não funcionar

1. **Verifique que está no diretório correto:**
   ```bash
   pwd
   # Deve mostrar: /Volumes/notebook/gabaritAI 2
   ```

2. **Verifique Node.js:**
   ```bash
   node --version  # deve ser v16+
   npm --version   # deve ser v7+
   ```

3. **Veja as linhas iniciais do erro:**
   - Se disser `/Volumes/TRI/GABARITAI-FINAL` ainda, limpe caches novamente
   - Se disser `/Volumes/notebook/gabaritAI 2`, então é outro problema

4. **Copie o erro completo e procure por:**
   - `[VITE]` - informações de debug
   - `[VITE ERROR]` - informações de erro

---

## Próximos Passos (após iniciar)

1. Abra http://localhost:8080
2. Clique em **"Cadastrar Gabarito"**
3. Clique em **"Nova Prova"** (seção Provas Personalizadas)
4. Crie uma prova de teste com:
   - **Nome:** "Teste Personalizado"
   - **Questões:** 30
   - **Alternativas:** 5
   - **Disciplinas:** 3 (ex: Português 1-10, Matemática 11-20, Ciências 21-30)
5. Clique em **"Salvar Configuração"**
6. ✅ Sucesso!

---

**Tempo estimado:** 3-5 minutos
**Porta:** 8080
**URL:** http://localhost:8080

🚀 Boa sorte!
