# 🔑 Variáveis de Ambiente Necessárias

## 📝 Como Configurar

1. Crie um arquivo `.env` na **raiz do projeto** (`gabaritosxtri/.env`)
2. Copie e cole o conteúdo abaixo, preenchendo as chaves obrigatórias

## 📋 Template do .env

```env
# ============================================
# CONFIGURAÇÃO DO SERVIDOR NODE.JS
# ============================================
PORT=8080
NODE_ENV=development

# ============================================
# OPENAI API (OBRIGATÓRIO)
# ============================================
# Chave da API OpenAI - OBRIGATÓRIA para validação de qualidade
OPENAI_API_KEY=sk-sua-chave-aqui

# ID do Assistant OpenAI - OBRIGATÓRIO para análise pedagógica
OPENAI_ASSISTANT_ID=asst_seu-assistant-id-aqui

# Modelo do ChatGPT (padrão: gpt-4o-mini)
CHATGPT_MODEL=gpt-4o-mini

# URL base da API OpenAI (padrão: https://api.openai.com/v1)
OPENAI_BASE_URL=https://api.openai.com/v1

# ============================================
# SERVIÇOS PYTHON (URLs)
# ============================================
# URL do serviço Python OMR (padrão: http://localhost:5002)
PYTHON_OMR_URL=http://localhost:5002

# URL do serviço Python TRI (padrão: http://localhost:5003)
PYTHON_TRI_URL=http://localhost:5003

# URL do serviço OCR DeepSeek (padrão: http://localhost:5001)
OCR_SERVICE_URL=http://localhost:5001

# ============================================
# CONFIGURAÇÕES OPCIONAIS
# ============================================
# Usar serviço Python OMR (padrão: true)
USE_PYTHON_OMR=true

# Usar serviço Python TRI (padrão: true)
USE_PYTHON_TRI=true
```

## ⚠️ Variáveis OBRIGATÓRIAS

### 1. `OPENAI_API_KEY`
- **Onde obter**: https://platform.openai.com/api-keys
- **Formato**: `sk-...`
- **Uso**: Validação de qualidade do escaneamento (ChatGPT Vision) e análise pedagógica

### 2. `OPENAI_ASSISTANT_ID`
- **Onde obter**: https://platform.openai.com/assistants
- **Formato**: `asst_...`
- **Uso**: Análise pedagógica com IA
- **Exemplo atual**: `asst_eOBUTVTFZGviZuE5h38hXQ72`

## 📍 Onde Criar o Arquivo

O arquivo `.env` deve estar na **raiz do projeto**:

```
gabaritosxtri/
├── .env          ← AQUI
├── package.json
├── server/
├── client/
└── ...
```

## ✅ Verificação

Após criar o `.env`, verifique se está correto:

```bash
# No terminal, na raiz do projeto
cat .env | grep OPENAI
```

Você deve ver:
```
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...
```

## 🚀 Próximos Passos

Após configurar o `.env`, siga as instruções em `COMO_RODAR.md`

