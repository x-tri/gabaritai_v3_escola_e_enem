# Arquitetura Técnica: XTRI Engine API — TRI V3

Este documento descreve a arquitetura interna da API, o fluxo de dados de cada motor e as decisões de modelagem TRI. Destinado ao desenvolvedor que precisará manter, estender ou debugar o serviço.

## 1. Visão Geral do Fluxo

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND / BACKEND NODE.JS                       │
│                                                                          │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐    │
│  │  Gabaritaí V3 App   │    │  XTRI Student Office / OMR Pipeline  │    │
│  │  (React + Node.js)  │    │  (Next.js + Supabase)                │    │
│  └────────┬────────────┘    └──────────────┬───────────────────────┘    │
│           │                                │                            │
│           │ POST /api/calcular-tri         │ POST /api/v3/calibrar-     │
│           │ (mesmo contrato V2)            │      cientifico            │
│           │                                │ POST /api/v3/estimar-theta │
│           │                                │ GET  /api/v3/referencias/  │
└───────────┼────────────────────────────────┼────────────────────────────┘
            │                                │
            ▼                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     XTRI ENGINE API — TRI V3 (:5003)                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  main.py (FastAPI)                                              │    │
│  │  - CORS aberto (retrocompatível com V2)                         │    │
│  │  - Conversor numpy → JSON nativo                                │    │
│  │  - Lifespan: carrega tabela de referência no startup            │    │
│  └──────────┬──────────────────────────────────┬───────────────────┘    │
│             │                                  │                        │
│             ▼                                  ▼                        │
│  ┌─────────────────────┐        ┌─────────────────────────────┐        │
│  │  Motor Heurístico   │        │  Motor Científico           │        │
│  │  (heuristico.py)    │        │  (cientifico.py)            │        │
│  │                     │        │                             │        │
│  │  1. % acerto/turma  │        │  1. MML (L-BFGS-B)         │        │
│  │  2. Classif. faixas │        │  2. EAP (quadratura)        │        │
│  │  3. Coerência       │        │  3. Rank percentil          │        │
│  │  4. Ancoragem       │        │  4. Ancoragem               │        │
│  └──────────┬──────────┘        └──────────────┬──────────────┘        │
│             │                                  │                        │
│             ▼                                  ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  tabela_referencia.py                                           │    │
│  │  Tabela oficial ENEM 2024 (JSON): {area → {acertos → min/med/max}} │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

## 2. Motor Heurístico — Fluxo Detalhado

O motor heurístico é a reimplementação fiel do `tri_v2_producao.py` do Gabaritaí V2. Ele não calibra parâmetros de itens no sentido estatístico, mas utiliza a distribuição empírica de acertos da turma para classificar questões e ajustar notas por coerência pedagógica.

### Passo a Passo

**Passo 1 — Análise da Turma (TCT):** Para cada questão, calcula-se a porcentagem de acerto da turma inteira. Essa taxa é usada como proxy da dificuldade empírica do item.

**Passo 2 — Classificação por Faixas:** Cada questão é classificada em uma das cinco faixas de dificuldade com base na taxa de acerto:

| Faixa | Taxa de Acerto | Interpretação |
|---|---|---|
| Muito Fácil | >= 80% | Questão dominada pela turma |
| Fácil | >= 60% | Questão acessível |
| Média | >= 40% | Questão intermediária |
| Difícil | >= 20% | Questão desafiadora |
| Muito Difícil | < 20% | Questão dominada por poucos |

**Passo 3 — Análise de Coerência:** Para cada aluno, verifica-se se o padrão de acertos segue a hierarquia esperada (acerta mais fáceis do que difíceis). A coerência é um score de 0.0 a 1.0 composto por três fatores: padrão hierárquico (30%), peso por classificação (30%) e peso por dificuldade real (40%).

**Passo 4 — Ancoragem com Ajuste:** A nota base é a mediana da tabela de referência para o número de acertos. Um bônus (coerência alta) ou penalidade (incoerência) é aplicado dentro do intervalo [tri_min, tri_max] da tabela. A nota final nunca ultrapassa os limites oficiais do ENEM 2024.

### Arquivo: `app/motores/heuristico.py`

| Função | Responsabilidade |
|---|---|
| `classificar_dificuldade(pct)` | Classifica questão nas 5 faixas |
| `analisar_coerencia(respostas_por_dificuldade)` | Calcula score de coerência 0.0–1.0 |
| `calcular_tri_area(area, acertos, tabela, ...)` | Calcula TRI para uma área com ajustes |
| `processar_turma(alunos, gabarito, areas_config, tabela)` | Orquestra o fluxo completo da turma |

## 3. Motor Científico — Fluxo Detalhado

O motor científico implementa a TRI real com o modelo logístico de 2 parâmetros (2PL, com $c$ fixo). É matematicamente rigoroso e produz parâmetros de itens que podem ser armazenados no banco de itens para uso futuro.

### Modelo Matemático

A probabilidade de acerto do aluno $i$ no item $j$ é dada pela função característica do item (CCI):

$$P(X_{ij} = 1 | \theta_i) = c + \frac{1 - c}{1 + e^{-a_j(\theta_i - b_j)}}$$

Onde $a_j$ é a discriminação do item, $b_j$ é a dificuldade, $c = 0.20$ é o parâmetro de acerto casual (fixo para 5 alternativas), e $\theta_i$ é o traço latente (proficiência) do aluno.

### Passo a Passo

**Passo 1 — Calibração MML (Marginal Maximum Likelihood):** Para cada item, os parâmetros $a$ e $b$ são estimados maximizando a verossimilhança marginal. A integração sobre $\theta$ é feita por quadratura gaussiana com 41 pontos e prior $N(0,1)$. A otimização usa L-BFGS-B com bounds $a \in [0.3, 4.0]$ e $b \in [-4.0, 4.0]$.

**Passo 2 — Estimação EAP (Expected A Posteriori):** Para cada aluno, o $\theta$ é estimado como a esperança da distribuição posterior $p(\theta | \mathbf{x})$, calculada por quadratura com prior $N(0,1)$. O erro padrão (SE) é o desvio padrão da posterior.

**Passo 3 — Ancoragem por Rank Percentil:** Os alunos são agrupados pelo número de acertos ($K$). Dentro de cada grupo, o rank percentil do $\theta$ determina a posição no intervalo $[\text{ref\_min}_K, \text{ref\_max}_K]$ da tabela oficial. Isso garante que dois alunos com o mesmo número de acertos mas padrões de resposta diferentes recebam notas diferentes (essência da TRI).

**Passo 4 — Classificação de Estado TRI:** A nota ancorada é classificada em um dos cinco estados usados no XTRI Student Office:

| Estado | Nota TRI | Sprite |
|---|---|---|
| CHAMPION | >= 650 | Estrela dourada |
| ON_FIRE | >= 580 | Fogo laranja |
| STUDYING | >= 480 | Livro verde |
| NEEDS_REVIEW | >= 380 | Alerta cinza |
| NEW_STUDENT | < 380 | Iniciante |

### Arquivo: `app/motores/cientifico.py`

| Função | Responsabilidade |
|---|---|
| `P(theta, a, b, c)` | Função CCI (3PL/2PL) |
| `_neg_log_lik_item(params, responses, c, ...)` | Verossimilhança marginal negativa de um item |
| `calibrar_itens(resp_matrix, c, n_quad)` | Calibra todos os itens via MML |
| `eap_theta(responses, item_params, n_quad)` | Estima θ e SE via EAP |
| `ancorar_notas(thetas, tabela, area)` | Mapeia θ → nota via rank percentil |
| `estado_tri(nota)` | Classifica nota em estado para o Student Office |
| `pipeline_cientifico(alunos, area, tabela, c_fixo)` | Orquestra o pipeline completo |
| `estimar_theta_individual(respostas, params, area, tabela)` | Estima nota de um único aluno |

## 4. Tabela de Referência

A tabela de referência (`tri_tabela_referencia_oficial.json`) é o artefato central de ancoragem. Ela define, para cada área (LC, CH, CN, MT) e cada número de acertos (0 a 45), os valores mínimo, mediano e máximo da nota TRI na escala ENEM.

### Limites Oficiais ENEM 2024

| Área | Nota Mínima | Nota Máxima |
|---|---|---|
| LC | 294.0 | 796.0 |
| CH | 284.0 | 820.0 |
| MT | 334.0 | 962.0 |
| CN | 308.0 | 867.0 |

Esses limites são aplicados como teto absoluto em ambos os motores, garantindo que nenhuma nota estimada ultrapasse os valores oficiais.

### Arquivo: `app/tabela_referencia.py`

| Função/Classe | Responsabilidade |
|---|---|
| `TabelaReferenciaTRI` | Carrega e valida o JSON, expõe lookup por área/acertos |
| `TRI_MAXIMA_OFICIAL` | Dict com os tetos oficiais por área |

## 5. Modelos Pydantic (Contratos de API)

Todos os contratos de entrada e saída são definidos em `app/models.py` com Pydantic v2. Isso garante validação automática, documentação Swagger e serialização segura.

### Contratos do Motor Heurístico (Compatibilidade V2)

| Modelo | Direção | Descrição |
|---|---|---|
| `RequestCalcularTRI` | Entrada | Aceita alunos como lista de dicts (q1, q2...) ou com campo `respostas` |
| `ResponseCalcularTRI` | Saída | Retorna `status`, `total_alunos`, `prova_analysis`, `resultados` |

O endpoint aceita JSON raw (via `Request.json()`) para máxima compatibilidade com o formato que o Node.js já envia.

### Contratos do Motor Científico (V3)

| Modelo | Direção | Descrição |
|---|---|---|
| `RequestCalibrarCientifico` | Entrada | `simulado_id`, `area`, `c_fixo`, lista de alunos com vetor binário |
| `ResponseCalibrarCientifico` | Saída | `parametros_itens`, `resultados_alunos`, `diagnostico` |
| `RequestEstimarTheta` | Entrada | `area`, `parametros_itens` (pré-calibrados), `respostas` |
| `ResponseEstimarTheta` | Saída | `acertos`, `theta`, `se`, `nota_ancorada`, `estado_tri` |

## 6. Docker e Deploy

### Dockerfile

O Dockerfile usa Python 3.11-slim como base, instala as dependências, copia apenas o diretório `app/`, cria um usuário não-root (`appuser`), e inicia o Uvicorn com 2 workers. O healthcheck verifica `GET /health` a cada 30 segundos.

### docker-compose.yml

O compose monta o diretório `./app` como volume read-only para desenvolvimento local, permitindo editar o código sem rebuild. A porta 5003 é exposta e o container reinicia automaticamente.

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PYTHONUNBUFFERED` | `1` | Desabilita buffer do stdout (logs em tempo real) |
| `PORT` | `5003` | Porta da API (configurável no Dockerfile) |

## 7. Decisões de Modelagem

As decisões de modelagem seguem as diretrizes documentadas no projeto MIRT da XTRI:

**Por que 2PL e não 3PL completo?** Com amostras de simulados escolares (N < 500), estimar o parâmetro $c$ livremente gera instabilidade numérica. Fixar $c = 0.20$ (probabilidade de acerto casual com 5 alternativas) é a prática padrão para esse contexto e produz estimativas mais estáveis.

**Por que EAP e não MLE?** O estimador MLE diverge para $\pm\infty$ quando o aluno acerta tudo ou erra tudo. O EAP com prior $N(0,1)$ é mais robusto e sempre retorna um valor finito, sendo preferido para contextos educacionais.

**Por que ancoragem por rank percentil?** A ancoragem direta (linear) pode gerar notas fora do intervalo esperado quando a distribuição de $\theta$ é assimétrica. O rank percentil garante que a nota sempre caia dentro de $[\text{ref\_min}_K, \text{ref\_max}_K]$, respeitando a tabela oficial.

**Por que processar cada simulado × área separadamente?** Cada prova tem seus próprios construtos e especificidades. Misturar dados de simulados diferentes viola a premissa de unidimensionalidade da TRI e pode gerar parâmetros enviesados.
