# Manual do Usuario - Sistema de Correcao ENEM X-TRI

## Indice

1. [Visao Geral](#1-visao-geral)
2. [Requisitos e Instalacao](#2-requisitos-e-instalacao)
3. [Iniciando o Sistema](#3-iniciando-o-sistema)
4. [Criando um Novo Projeto](#4-criando-um-novo-projeto)
5. [Configurando o Gabarito Oficial](#5-configurando-o-gabarito-oficial)
6. [Upload e Correcao de PDFs](#6-upload-e-correcao-de-pdfs)
7. [Revisao Manual das Respostas](#7-revisao-manual-das-respostas)
8. [Calculo TRI e Analise](#8-calculo-tri-e-analise)
9. [Aba Alunos - Visualizacao Individual](#9-aba-alunos---visualizacao-individual)
10. [Analise Pedagogica com IA](#10-analise-pedagogica-com-ia)
11. [Exportacao de Dados](#11-exportacao-de-dados)
12. [Correcao ENEM Completo (Dia 1 + Dia 2)](#12-correcao-enem-completo-dia-1--dia-2)
13. [Resolucao de Problemas](#13-resolucao-de-problemas)

---

## 1. Visao Geral

O Sistema de Correcao ENEM X-TRI e uma plataforma completa para:

- **Leitura automatica (OMR)** de folhas de resposta escaneadas
- **Calculo de notas TRI** usando a escala oficial do ENEM
- **Analise pedagogica** com inteligencia artificial
- **Gerenciamento de turmas** e acompanhamento individual

### Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend React                        │
│                  http://localhost:8080                   │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                   Backend Node.js                        │
│                     Porta 8080                           │
└─────────────────────────────────────────────────────────┘
           │                              │
┌──────────────────────┐    ┌──────────────────────────────┐
│   Servico OMR        │    │      Servico TRI             │
│   Python (5002)      │    │      Python (5003)           │
│   Leitura de bolhas  │    │   Calculo escala oficial     │
└──────────────────────┘    └──────────────────────────────┘
```

---

## 2. Requisitos e Instalacao

### Requisitos do Sistema

- **Node.js** 18+
- **Python** 3.9+
- **Poppler** (para conversao de PDFs)

### Instalacao macOS

```bash
# Instalar Homebrew (se nao tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar dependencias
brew install node poppler

# Clonar/extrair o projeto
cd /caminho/para/gabaritosxtri

# Instalar dependencias Node.js
npm install

# Configurar servicos Python
cd python_omr_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

cd ../python_tri_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Instalacao Windows

```powershell
# Instalar Node.js de https://nodejs.org
# Instalar Python de https://python.org
# Instalar Poppler de https://github.com/oschwartz10612/poppler-windows

# No diretorio do projeto
npm install

# Servicos Python (PowerShell)
cd python_omr_service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate

cd ..\python_tri_service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 3. Iniciando o Sistema

### Inicializacao Rapida (Script)

```bash
# Na raiz do projeto
./start_all.sh
```

### Inicializacao Manual

**Terminal 1 - Servico OMR:**
```bash
cd python_omr_service
source venv/bin/activate
python3 app_hibrido.py
# Aguarde: "OMR HIBRIDO - Servico Iniciado" na porta 5002
```

**Terminal 2 - Servico TRI:**
```bash
cd python_tri_service
source venv/bin/activate
python3 app.py
# Aguarde: "Servidor TRI V2" na porta 5003
```

**Terminal 3 - Aplicacao Principal:**
```bash
npm run dev
# Acesse: http://localhost:8080
```

### Verificando se Esta Funcionando

Acesse no navegador:
- http://localhost:8080 - Interface principal
- http://localhost:5002/health - Status do OMR
- http://localhost:5003/health - Status do TRI

---

## 4. Criando um Novo Projeto

### Passo 1: Acessar a Tela Inicial

Ao abrir http://localhost:8080, voce vera a tela inicial com opcoes de criar ou carregar projetos.

<!-- SCREENSHOT: tela_inicial.png -->
```
┌─────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════╗  │
│  ║         SISTEMA DE CORRECAO ENEM X-TRI            ║  │
│  ╚═══════════════════════════════════════════════════╝  │
│                                                         │
│    [Criar Novo Projeto]     [Carregar Projeto]          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Projetos Recentes:                              │   │
│  │  - Turma 3A - ENEM 2024 Dia 1                   │   │
│  │  - Turma 3B - Simulado Outubro                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Passo 2: Preencher Dados do Projeto

Clique em **"Criar Novo Projeto"** e preencha:

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| Nome do Projeto | Identificacao da turma/prova | "Turma 3A - ENEM 2024 Dia 1" |
| Dia do ENEM | Selecione Dia 1 ou Dia 2 | Dia 1 (LC + CH) |
| Numero de Questoes | Total de questoes | 90 |
| Observacoes | Notas adicionais | "Simulado preparatorio" |

<!-- SCREENSHOT: criar_projeto.png -->

### Passo 3: Confirmar Criacao

Clique em **"Criar Projeto"**. O sistema criara o projeto e abrira a tela de configuracao do gabarito.

---

## 5. Configurando o Gabarito Oficial

### Metodo 1: Digitacao Manual

Na aba **"Gabarito"**, digite as respostas uma a uma:

<!-- SCREENSHOT: gabarito_manual.png -->
```
┌─────────────────────────────────────────────────────────┐
│  GABARITO OFICIAL                                       │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Q1:  [A] [B] [C] [D] [E]     Q46: [A] [B] [C] [D] [E]  │
│  Q2:  [A] [B] [C] [D] [E]     Q47: [A] [B] [C] [D] [E]  │
│  Q3:  [A] [B] [C] [D] [E]     Q48: [A] [B] [C] [D] [E]  │
│  ...                          ...                       │
│                                                         │
│  [Salvar Gabarito]                                      │
└─────────────────────────────────────────────────────────┘
```

### Metodo 2: Colar Lista de Respostas

Cole uma lista de letras separadas por virgula ou espaco:

```
A,B,C,D,E,A,B,C,D,E,A,B,C,D,E...
```

Ou cole linha a linha:
```
A
B
C
D
E
...
```

### Metodo 3: Importar de Arquivo

Clique em **"Importar Gabarito"** e selecione um arquivo `.txt` ou `.csv` com as respostas.

---

## 6. Upload e Correcao de PDFs

### Preparando os PDFs

**Requisitos para o PDF:**
- Resolucao minima: 200 DPI (recomendado: 300 DPI)
- Formato: PDF com paginas escaneadas
- Uma folha de resposta por pagina
- Orientacao: Retrato

**Modelo de Folha de Resposta:**
O sistema usa o modelo padrao ENEM com 90 questoes (6 colunas x 15 linhas).

### Passo 1: Selecionar PDF

Na aba **"Correcao"**, clique em **"Selecionar PDF"** ou arraste o arquivo.

<!-- SCREENSHOT: upload_pdf.png -->
```
┌─────────────────────────────────────────────────────────┐
│  UPLOAD DE GABARITOS                                    │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │     Arraste o PDF aqui ou clique para           │   │
│  │              selecionar arquivo                  │   │
│  │                                                  │   │
│  │         [Selecionar PDF]                         │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Formatos aceitos: PDF                                  │
│  Tamanho maximo: 50MB                                   │
└─────────────────────────────────────────────────────────┘
```

### Passo 2: Aguardar Processamento

O sistema processara cada pagina automaticamente:

<!-- SCREENSHOT: processando.png -->
```
┌─────────────────────────────────────────────────────────┐
│  PROCESSANDO...                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Pagina 1 de 35                                         │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  45%          │
│                                                         │
│  Status: Lendo questoes 46-60...                        │
│                                                         │
│  Tempo estimado: 2 minutos                              │
└─────────────────────────────────────────────────────────┘
```

### Passo 3: Verificar Resultados

Apos o processamento, voce vera um resumo:

<!-- SCREENSHOT: resultado_correcao.png -->
```
┌─────────────────────────────────────────────────────────┐
│  RESULTADO DA CORRECAO                                  │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Total de paginas: 35                                   │
│  Alunos identificados: 35                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Pagina │ Matricula │ Nome     │ Acertos │ Conf. │   │
│  ├────────┼───────────┼──────────┼─────────┼───────┤   │
│  │   1    │  12345    │ JOAO S.  │  72/90  │  98%  │   │
│  │   2    │  12346    │ MARIA L. │  68/90  │  99%  │   │
│  │   3    │  12347    │ PEDRO A. │  45/90  │  87%  │   │
│  │  ...   │   ...     │   ...    │   ...   │  ...  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Revisar Respostas]  [Calcular TRI]  [Exportar]        │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Revisao Manual das Respostas

### Identificando Problemas

O sistema marca automaticamente:

| Indicador | Significado | Acao |
|-----------|-------------|------|
| **Verde** | Resposta detectada com alta confianca | Nenhuma |
| **Amarelo** | Confianca media - verificar | Revisar visualmente |
| **Vermelho (X)** | Dupla marcacao detectada | Escolher resposta ou anular |
| **Cinza vazio** | Questao em branco | Verificar se correto |

### Corrigindo uma Resposta

1. Clique na celula da resposta que deseja corrigir
2. Selecione a nova opcao (A, B, C, D, E ou X para anular)
3. A alteracao e salva automaticamente

<!-- SCREENSHOT: revisao_manual.png -->
```
┌─────────────────────────────────────────────────────────┐
│  REVISAO - Pagina 3 (PEDRO ALMEIDA - 12347)            │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌───────────────────┐  ┌───────────────────────────┐  │
│  │                   │  │ Q1:  [A]  B   C   D   E   │  │
│  │   [Imagem da      │  │ Q2:   A  [B]  C   D   E   │  │
│  │    folha de       │  │ Q3:   A   B  [C]  D   E   │  │
│  │    resposta]      │  │ Q4:   A   B   C  [D]  E   │  │
│  │                   │  │ Q5:  [X] DUPLA MARCACAO   │  │
│  │                   │  │ Q6:   A   B   C   D  [E]  │  │
│  │                   │  │ ...                       │  │
│  └───────────────────┘  └───────────────────────────┘  │
│                                                         │
│  Legenda:                                               │
│  [Verde] Correto  [Laranja] Errado  [X Vermelho] Dupla  │
└─────────────────────────────────────────────────────────┘
```

### Relatorio de Problemas

Clique no botao **"Relatorio"** (laranja) na aba Alunos para ver paginas com problemas:

- Baixa confianca de leitura
- Muitas questoes em branco
- Duplas marcacoes

---

## 8. Calculo TRI e Analise

### Iniciando o Calculo TRI

Apos revisar as respostas, clique em **"Calcular TRI"**.

<!-- SCREENSHOT: calculo_tri.png -->
```
┌─────────────────────────────────────────────────────────┐
│  CALCULO TRI                                            │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Processando 35 alunos...                               │
│  ████████████████████████████████████████  100%         │
│                                                         │
│  [Concluido em 3.2 segundos]                            │
└─────────────────────────────────────────────────────────┘
```

### Entendendo os Resultados

A aba **TRI/TCT** mostra estatisticas detalhadas:

<!-- SCREENSHOT: resultado_tri.png -->
```
┌─────────────────────────────────────────────────────────┐
│  RESULTADOS TRI                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ESTATISTICAS DA TURMA:                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Media TRI Geral: 542.3                          │   │
│  │                                                  │   │
│  │  Por Area:                                       │   │
│  │  - Linguagens (LC):     523.4                    │   │
│  │  - Ciencias Humanas:    561.2                    │   │
│  │  - Ciencias Natureza:   498.7                    │   │
│  │  - Matematica:          586.1                    │   │
│  │                                                  │   │
│  │  Maior nota: 687.2 (MARIA LIMA)                  │   │
│  │  Menor nota: 398.5 (JOSE SANTOS)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Ver Grafico]  [Recalcular TRI]  [Exportar Notas]      │
└─────────────────────────────────────────────────────────┘
```

### Grafico de Distribuicao

O sistema gera automaticamente graficos de distribuicao de notas:

```
     Distribuicao de Notas TRI

  12 │        ████
  10 │      ████████
   8 │    ████████████
   6 │  ████████████████
   4 │████████████████████
   2 │██████████████████████
     └────────────────────────
      350  450  550  650  750
              Nota TRI
```

---

## 9. Aba Alunos - Visualizacao Individual

### Lista de Alunos

A aba **"Alunos"** mostra todos os estudantes com suas notas:

<!-- SCREENSHOT: lista_alunos.png -->
```
┌─────────────────────────────────────────────────────────┐
│  ALUNOS                                  [Relatorio]    │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Buscar: [________________] [Filtrar por nota ▼]        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ # │ Matricula │ Nome          │ Acertos │  TRI  │   │
│  ├───┼───────────┼───────────────┼─────────┼───────┤   │
│  │ 1 │  12346    │ MARIA LIMA    │  82/90  │ 687.2 │   │
│  │ 2 │  12348    │ CARLOS SILVA  │  79/90  │ 654.8 │   │
│  │ 3 │  12345    │ JOAO SANTOS   │  72/90  │ 598.3 │   │
│  │...│    ...    │     ...       │   ...   │  ...  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Indicadores de Confianca:                              │
│  [Verde] Alta  [Amarelo] Media  [Vermelho] Baixa        │
└─────────────────────────────────────────────────────────┘
```

### Detalhes do Aluno

Clique em um aluno para ver detalhes completos:

<!-- SCREENSHOT: detalhe_aluno.png -->
```
┌─────────────────────────────────────────────────────────┐
│  MARIA LIMA (12346)                                     │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  NOTAS POR AREA:                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Linguagens (LC):        678.4   ████████████   │   │
│  │  Ciencias Humanas (CH):  712.1   █████████████  │   │
│  │  Ciencias Natureza (CN): 645.2   ███████████    │   │
│  │  Matematica (MT):        703.2   ████████████   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  DESEMPENHO:                                            │
│  - Acertos: 82/90 (91.1%)                               │
│  - Questoes em branco: 0                                │
│  - Duplas marcacoes: 0                                  │
│                                                         │
│  [Ver Respostas]  [Gerar Analise IA]  [Imprimir]        │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Analise Pedagogica com IA

### Gerando Analise da Turma

Na aba TRI/TCT, clique em **"Gerar Analise com ChatGPT"**:

<!-- SCREENSHOT: analise_turma.png -->
```
┌─────────────────────────────────────────────────────────┐
│  ANALISE PEDAGOGICA DA TURMA                            │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PONTOS FORTES:                                         │
│  - Excelente desempenho em Matematica (media 586)       │
│  - Boa compreensao de textos em Linguagens              │
│                                                         │
│  AREAS DE ATENCAO:                                      │
│  - Ciencias da Natureza abaixo da media (498)           │
│  - Dificuldade em questoes de Fisica (mecanica)         │
│  - Interpretacao de graficos precisa reforco            │
│                                                         │
│  RECOMENDACOES:                                         │
│  1. Intensificar revisao de Fisica basica               │
│  2. Trabalhar leitura de graficos e tabelas             │
│  3. Simulados focados em CN                             │
│                                                         │
│  HABILIDADES PRIORITARIAS (TRI 450-550):                │
│  - H17: Relacionar informacoes de graficos              │
│  - H24: Aplicar leis de Newton                          │
│  - H28: Avaliar impactos ambientais                     │
└─────────────────────────────────────────────────────────┘
```

### Gerando Analise Individual

No detalhe do aluno, clique em **"Gerar Analise IA"**:

```
┌─────────────────────────────────────────────────────────┐
│  ANALISE INDIVIDUAL - JOSE SANTOS                       │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PERFIL DO ALUNO:                                       │
│  TRI Medio: 398.5 (abaixo da media da turma)            │
│                                                         │
│  DIAGNOSTICO:                                           │
│  - Dificuldade acentuada em Matematica (312)            │
│  - Razoavel em Ciencias Humanas (445)                   │
│  - Muitos erros em questoes basicas                     │
│                                                         │
│  PLANO DE ESTUDOS SUGERIDO:                             │
│  Semana 1-2: Revisao de algebra basica                  │
│  Semana 3-4: Geometria plana                            │
│  Semana 5-6: Funcoes e graficos                         │
│                                                         │
│  QUESTOES PARA PRATICAR:                                │
│  - Focar em questoes TRI 350-450                        │
│  - Evitar questoes muito dificeis por enquanto          │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Exportacao de Dados

### Exportar para Excel

Clique em **"Exportar"** > **"Excel (.xlsx)"**:

O arquivo gerado contem:
- Planilha "Resumo": Notas gerais
- Planilha "Detalhado": Resposta por resposta
- Planilha "Estatisticas": Medias e distribuicao

### Exportar para CSV

Clique em **"Exportar"** > **"CSV"**:

```csv
matricula,nome,acertos,tri_lc,tri_ch,tri_cn,tri_mt,tri_media
12346,MARIA LIMA,82,678.4,712.1,645.2,703.2,684.7
12348,CARLOS SILVA,79,654.8,678.3,612.4,673.9,654.9
...
```

### Exportar Analise IA

Clique em **"Exportar Analise"** para salvar o relatorio pedagogico em PDF ou TXT.

---

## 12. Correcao ENEM Completo (Dia 1 + Dia 2)

O ENEM e dividido em dois dias:
- **Dia 1**: Linguagens (LC) + Ciencias Humanas (CH) - 90 questoes
- **Dia 2**: Ciencias da Natureza (CN) + Matematica (MT) - 90 questoes

### Fluxo de Correcao Completa

#### Passo 1: Corrigir Dia 1

1. Crie um projeto selecionando **"Dia 1"**
2. Configure o gabarito do Dia 1
3. Faca upload do PDF com as folhas do Dia 1
4. Calcule TRI (gerara notas de LC e CH)
5. **Salve o projeto**

#### Passo 2: Corrigir Dia 2

1. Crie um **novo projeto** selecionando **"Dia 2"**
2. Configure o gabarito do Dia 2
3. Faca upload do PDF com as folhas do Dia 2
4. Calcule TRI (gerara notas de CN e MT)

#### Passo 3: Mesclar os Resultados

Apos calcular TRI do Dia 2, clique em **"Finalizar Correcao ENEM"**:

<!-- SCREENSHOT: mesclar_dias.png -->
```
┌─────────────────────────────────────────────────────────┐
│  FINALIZAR CORRECAO ENEM                                │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Selecione o projeto do Dia 1 para mesclar:             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ( ) Turma 3A - ENEM 2024 Dia 1                  │   │
│  │ ( ) Turma 3B - ENEM 2024 Dia 1                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Mesclar e Calcular Nota Final]                        │
└─────────────────────────────────────────────────────────┘
```

O sistema:
1. Busca o projeto do Dia 1 selecionado
2. Combina os alunos pela **matricula**
3. Calcula a nota final com as 4 areas

#### Resultado Final

```
┌─────────────────────────────────────────────────────────┐
│  RESULTADO ENEM COMPLETO                                │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Aluno: MARIA LIMA (12346)                              │
│                                                         │
│  DIA 1:                    DIA 2:                       │
│  - LC: 678.4               - CN: 645.2                  │
│  - CH: 712.1               - MT: 703.2                  │
│                                                         │
│  MEDIA FINAL: 684.7                                     │
│                                                         │
│  ════════════════════════════════════════════════════   │
│                                                         │
│  RANKING DA TURMA:                                      │
│  1. MARIA LIMA      - 684.7                             │
│  2. CARLOS SILVA    - 654.9                             │
│  3. JOAO SANTOS     - 598.3                             │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 13. Resolucao de Problemas

### Problema: OMR nao detecta respostas corretamente

**Possiveis causas:**
- PDF com baixa resolucao (< 200 DPI)
- Folha escaneada torta
- Marcacoes muito claras

**Solucoes:**
1. Re-escaneie com 300 DPI
2. Use o scanner com alimentador automatico (mais reto)
3. Peca aos alunos para marcar com mais forca

### Problema: Servico OMR nao inicia

**Verificar:**
```bash
# Ver se a porta esta em uso
lsof -i :5002

# Verificar logs
cd python_omr_service
source venv/bin/activate
python3 app_hibrido.py
```

### Problema: Calculo TRI retorna erro

**Verificar:**
```bash
# Testar servico TRI
curl http://localhost:5003/health

# Ver logs
cd python_tri_service
source venv/bin/activate
python3 app.py
```

### Problema: Alunos nao casam entre Dia 1 e Dia 2

**Causa:** Matriculas diferentes nos dois dias

**Solucao:**
1. Verifique se a matricula esta correta em ambos os projetos
2. A matricula deve ser identica (mesmo formato, sem espacos extras)

### Problema: Erro ao exportar Excel

**Verificar:**
- Todos os alunos tem notas calculadas?
- O navegador permite downloads?

### Logs e Debug

Para ativar modo debug:

```bash
# OMR com debug
cd python_omr_service
python3 app_hibrido.py --debug

# Backend com logs detalhados
DEBUG=* npm run dev
```

---

## Suporte

Para reportar problemas ou sugestoes:
- Crie uma issue no repositorio
- Inclua: versao do sistema, logs de erro, screenshots

---

**Versao do Manual:** 1.0
**Ultima atualizacao:** Dezembro 2024
