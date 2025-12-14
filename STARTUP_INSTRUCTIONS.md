# 🚀 Instruções de Inicialização

## Problema Encontrado
O servidor estava tentando acessar o caminho antigo `/Volumes/TRI/GABARITAI-FINAL/gabaritAI 2/`.

## Solução Aplicada
- ✅ Atualizados `vite.ts` e `vite.config.ts` para usar `process.cwd()` em vez de `import.meta.dirname`
- ✅ Garante que o servidor use o diretório de trabalho atual

## Como Executar

### Passo 1: Limpar caches (IMPORTANTE!)
```bash
cd "/Volumes/notebook/gabaritAI 2"
rm -rf node_modules
rm -rf dist
rm -rf .vite
rm -rf .next
npm cache clean --force
```

### Passo 2: Reinstalar dependências
```bash
npm install
```

### Passo 3: Iniciar o servidor
```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:8080`

## Se ainda houver erro
Se o erro persistir, tente:
1. Verifique que está no diretório correto:
   ```bash
   pwd
   # Deve mostrar: /Volumes/notebook/gabaritAI 2
   ```

2. Limpe completamente:
   ```bash
   rm -rf node_modules package-lock.json dist .vite
   npm install --legacy-peer-deps
   npm run dev
   ```

## Testando a Aplicação
Após iniciar com sucesso:
- Abra `http://localhost:8080` no navegador
- Clique em "Cadastrar Gabarito"
- Teste a seção "Provas Personalizadas"
- Crie uma nova prova personalizada com:
  - Nome: "Teste Personalizado"
  - Questões: 30
  - Disciplinas: 3

## Checklist de Testes
- [ ] Servidor inicia sem erros
- [ ] Interface carrega em localhost:8080
- [ ] Botão "Cadastrar Gabarito" funciona
- [ ] Seção "Provas Personalizadas" é visível
- [ ] Botão "Nova Prova" abre o wizard
- [ ] Wizard valida corretamente as disciplinas
- [ ] Configuração pode ser salva com sucesso
