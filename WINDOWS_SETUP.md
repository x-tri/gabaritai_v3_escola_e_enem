# 🪟 Guia de Instalação - Windows

## 📋 Pré-requisitos (Instalar antes de tudo)

### 1. Node.js (v18+)
- Baixar: https://nodejs.org/
- Ou via PowerShell: `winget install OpenJS.NodeJS.LTS`

### 2. Python (3.9 - 3.11)
- Baixar: https://www.python.org/downloads/
- ⚠️ **IMPORTANTE:** Marcar "Add Python to PATH" durante instalação!

### 3. Poppler (necessário para converter PDF em imagem)
1. Baixar: https://github.com/oschwartz10612/poppler-windows/releases
2. Extrair para: `C:\Program Files\poppler`
3. Adicionar ao PATH:
   - Pesquisar "Variáveis de Ambiente" no Windows
   - Editar variável `Path` do sistema
   - Adicionar: `C:\Program Files\poppler\Library\bin`
   - Reiniciar o terminal

### 4. Git (para clonar o projeto)
- Baixar: https://git-scm.com/

---

## 📁 Estrutura de Diretórios do Projeto

```
gabaritosxtri/
├── client/                    # Frontend React
│   └── src/pages/home.tsx     # Página principal
├── server/                    # Backend Express.js
│   ├── routes.ts              # Rotas da API
│   └── src/reports/           # Exportação Excel
├── python_omr_service/        # Serviço OMR (porta 5002)
│   ├── app.py
│   └── requirements.txt
├── python_tri_service/        # Serviço TRI (porta 5003)
│   ├── app.py
│   └── requirements.txt
├── data/                      # Dados salvos
│   └── projetos.json
├── attached_assets/           # Templates PDF
└── package.json               # Dependências Node.js
```

---

## 🚀 Passo a Passo para Rodar

### Passo 1: Copiar o projeto
Copiar toda a pasta `gabaritosxtri` do Mac para o Windows (USB, rede, etc.)

### Passo 2: Abrir no VS Code
```powershell
cd C:\caminho\para\gabaritosxtri
code .
```

### Passo 3: Instalar dependências Node.js
```powershell
npm install
```

### Passo 4: Criar ambiente virtual Python - OMR Service
```powershell
cd python_omr_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..
```

### Passo 5: Criar ambiente virtual Python - TRI Service
```powershell
cd python_tri_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..
```

### Passo 6: Modificar package.json para Windows
Abrir `package.json` e trocar a linha:
```json
"dev": "NODE_ENV=development tsx server/index.ts",
```
Por:
```json
"dev": "set NODE_ENV=development && npx tsx server/index.ts",
```

---

## ▶️ Iniciar os Serviços (3 terminais)

### Terminal 1 - OMR Service (porta 5002)
```powershell
cd python_omr_service
.\venv\Scripts\activate
python app.py
```

### Terminal 2 - TRI Service (porta 5003)
```powershell
cd python_tri_service
.\venv\Scripts\activate
python app.py
```

### Terminal 3 - Servidor Principal (portas 8080 e 5173)
```powershell
npm run dev
```

### Acessar no navegador
- **http://localhost:5173** (Frontend)

---

## 🛑 Parar os Serviços
- Pressionar `Ctrl+C` em cada terminal
- Ou fechar os terminais

---

## ❓ Problemas Comuns

| Problema | Solução |
|----------|---------|
| `npm install` falha com `canvas` ou `sharp` | Instalar Visual Studio Build Tools: `winget install Microsoft.VisualStudio.2022.BuildTools` |
| `pdf2image` não funciona | Poppler não está no PATH. Verificar com `where pdftoppm` |
| Python não encontrado | Reinstalar Python marcando "Add to PATH" |
| Porta em uso | `netstat -ano \| findstr :8080` e depois `taskkill /PID <numero> /F` |
| Erro de permissão de script | Executar: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## 📊 Resumo das Portas

| Serviço | Porta |
|---------|-------|
| Frontend (Vite) | 5173 |
| Backend (Express) | 8080 |
| OMR Service | 5002 |
| TRI Service | 5003 |

---

## 📝 Checklist Final

- [ ] Node.js instalado (`node --version`)
- [ ] Python instalado (`python --version`)
- [ ] Poppler instalado (`where pdftoppm`)
- [ ] `npm install` executado sem erros
- [ ] venv do OMR criado
- [ ] venv do TRI criado
- [ ] package.json modificado para Windows
- [ ] 3 terminais abertos rodando os serviços
- [ ] http://localhost:5173 abrindo no navegador
