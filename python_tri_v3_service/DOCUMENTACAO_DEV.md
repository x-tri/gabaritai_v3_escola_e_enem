# Documentação Técnica: XTRI Engine API — TRI V3

Esta documentação foi elaborada para orientar a equipe de desenvolvimento na integração, manutenção e deploy da nova API TRI V3 (FastAPI + Docker). A arquitetura foi desenhada para ser um *drop-in replacement* da V2 atual, garantindo retrocompatibilidade total com o backend Node.js existente, ao mesmo tempo em que introduz o novo Motor Científico (MML + EAP) para calibrações reais [1].

## 1. Arquitetura Híbrida

A API V3 opera com dois motores de estimação distintos, cada um otimizado para um caso de uso específico no ecossistema XTRI:

### Motor Heurístico (V2 Compatível)
Mantém a lógica exata do `tri_v2_producao.py` original. Utiliza uma abordagem heurística baseada em faixas de dificuldade (Muito Fácil a Muito Difícil) e penalidades por incoerência pedagógica.
- **Uso ideal:** Feedback em tempo real no app, turmas pequenas (N < 30), ou quando não há dados suficientes para calibração real.
- **Endpoint:** `POST /api/calcular-tri`

### Motor Científico (MML + EAP)
Implementa a Teoria da Resposta ao Item (TRI) com o modelo logístico de 2 parâmetros (2PL), fixando o parâmetro de acerto casual ($c = 0.20$). Utiliza Estimação de Máxima Verossimilhança Marginal (MML) para calibrar os itens e Esperança a Posteriori (EAP) para estimar o traço latente ($\theta$). As notas são ancoradas na tabela oficial do ENEM 2024 [2].
- **Uso ideal:** Fechamento oficial de simulados (ex: Marista), calibração de banco de itens, turmas maiores (N > 40).
- **Endpoints:** `POST /api/v3/calibrar-cientifico` e `POST /api/v3/estimar-theta`

## 2. Estrutura do Projeto

O serviço foi construído utilizando FastAPI e Pydantic v2 para validação estrita de dados. A estrutura de diretórios segue o padrão MVC simplificado:

```text
python_tri_v3_service/
├── app/
│   ├── main.py                  # Ponto de entrada FastAPI e rotas
│   ├── models.py                # Schemas Pydantic (Entrada/Saída)
│   ├── tabela_referencia.py     # Gerenciador da tabela oficial do ENEM
│   ├── motores/
│   │   ├── heuristico.py        # Lógica do Motor V2
│   │   └── cientifico.py        # Lógica do Motor MIRT (MML+EAP)
│   └── referencias/
│       └── tri_tabela_referencia_oficial.json
├── Dockerfile                   # Multi-stage build otimizado
├── docker-compose.yml           # Ambiente de desenvolvimento local
└── requirements.txt             # Dependências (FastAPI, NumPy, SciPy)
```

## 3. Guia de Integração (Backend Node.js)

A migração da V2 para a V3 foi projetada para exigir **zero alterações de código** no backend Node.js (`server/routes.ts`).

### Passo a Passo para Deploy
1. Faça o build e deploy do container Docker da V3 (ex: no Railway, Fly.io ou VPS própria).
2. A API subirá por padrão na porta `5003`.
3. No ambiente do backend Node.js, altere a variável de ambiente `PYTHON_TRI_URL` para apontar para a nova URL da V3.
4. O backend Node.js continuará chamando `POST /api/calcular-tri` e recebendo o exato mesmo formato de resposta.

### Verificação de Saúde (Health Check)
O endpoint `GET /health` foi mantido e aprimorado. O backend Node.js já o utiliza para decidir se deve usar o fallback local.

```json
{
  "status": "online",
  "service": "xtri_engine_api",
  "version": "3.0.0",
  "motores": ["heuristico_v2", "cientifico_mirt"],
  "tabela_carregada": true
}
```

## 4. Referência de Endpoints (Motor Científico)

Para integrar o novo Motor Científico no dashboard ou no pipeline de OMR, utilize os novos endpoints da V3. A documentação interativa completa (Swagger UI) está disponível em `GET /docs` quando a API estiver rodando.

### 4.1. Calibração Completa de Simulado
`POST /api/v3/calibrar-cientifico`

Recebe uma matriz de respostas binárias (0/1) de uma turma inteira, calibra os parâmetros dos itens e estima as notas ancoradas. **Regra de Ouro:** Cada simulado e cada área devem ser enviados em requisições separadas [3].

**Payload de Entrada:**
```json
{
  "simulado_id": "sim_marista_01",
  "area": "LC",
  "ano_referencia": 2024,
  "c_fixo": 0.20,
  "alunos": [
    {
      "aluno_id": "uuid-123",
      "nome": "João Silva",
      "respostas": [1, 0, 1, 1, 0, ...] // Array de 45 inteiros (0 ou 1)
    }
  ]
}
```

**Resposta (Resumo):**
Retorna o diagnóstico da prova, os parâmetros calibrados ($a, b, c$) para cada item e os resultados individuais (Acertos, $\theta$, Erro Padrão, Nota Ancorada e Estado TRI).

### 4.2. Estimação Individual (Retardatários / OMR)
`POST /api/v3/estimar-theta`

Utilizado quando os parâmetros dos itens já foram calibrados (via endpoint anterior) e você precisa calcular a nota de um único aluno (ex: aluno que fez a prova depois, ou processamento assíncrono via OMR).

**Payload de Entrada:**
```json
{
  "area": "LC",
  "ano_referencia": 2024,
  "parametros_itens": [
    {"a": 1.2, "b": -0.5, "c": 0.20},
    // ... 45 itens
  ],
  "respostas": [1, 0, 1, 1, 0, ...] // Array de 45 inteiros
}
```

### 4.3. Consulta à Tabela Oficial
`GET /api/v3/referencias/{area}`

Retorna a tabela de referência oficial do ENEM (mínimo, médio e máximo) para uma determinada área (LC, CH, CN, MT). Útil para plotar gráficos no frontend do XTRI Student Office.

## 5. Desenvolvimento Local

Para rodar a API localmente e testar modificações:

**Usando Docker (Recomendado):**
```bash
cd python_tri_v3_service
docker compose up --build
```

**Usando Python nativo:**
```bash
cd python_tri_v3_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5003 --reload
```

Acesse `http://localhost:5003/docs` para interagir com a API via Swagger UI.

---
### Referências
[1] XTRI EdTech. Especificações de Arquitetura Híbrida TRI V3.
[2] INEP. Metodologia de Ancoragem e Escala de Proficiência ENEM 2024.
[3] Diretrizes de Modelagem TRI XTRI: Correção separada de simulados.
