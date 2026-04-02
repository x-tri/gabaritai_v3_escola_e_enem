# XTRI Engine API — TRI V3

API de estimação TRI para simulados ENEM com dois motores de cálculo. Construída em FastAPI com Docker, projetada como drop-in replacement da V2 (Flask) existente.

## Endpoints

| Motor | Rota | Uso |
|---|---|---|
| **Heurístico** (V2 compat.) | `POST /api/calcular-tri` | Feedback em tempo real, turmas pequenas |
| **Científico** (MML + EAP) | `POST /api/v3/calibrar-cientifico` | Fechamento de simulados, banco de itens |
| **Theta Individual** | `POST /api/v3/estimar-theta` | Alunos retardatários, OMR assíncrono |
| **Referências** | `GET /api/v3/referencias/{area}` | Tabela oficial para frontend |
| **Health Check** | `GET /health` | Monitoramento de saúde do serviço |

## Quick Start

```bash
# Docker (recomendado)
docker compose up --build

# Ou direto com Python
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5003 --reload
```

Acesse `http://localhost:5003/docs` para a documentação interativa (Swagger UI).

## Documentação

Para a documentação técnica completa, incluindo guia de integração com o backend Node.js, referência de payloads, estratégia de migração e detalhes da arquitetura híbrida, consulte o arquivo **[DOCUMENTACAO_DEV.md](DOCUMENTACAO_DEV.md)**.

## Testes

Os testes de integração estão no diretório `tests/` e podem ser executados com a API rodando localmente:

```bash
# Teste com dados sintéticos (5 cenários)
python3 tests/teste_sintetico.py

# Teste com dados reais de simulados (requer Doissimulados.xlsx)
python3 tests/teste_real_simulados.py
```

Os relatórios visuais do último teste real estão em `tests/relatorios/`.

## Migração V2 → V3

A rota `POST /api/calcular-tri` é um **drop-in replacement** da V2 (Flask). Para migrar, basta alterar a variável de ambiente `PYTHON_TRI_URL` no backend Node.js para apontar para a nova URL da V3. A V2 pode continuar rodando como fallback.

## Stack

| Componente | Tecnologia |
|---|---|
| Framework | FastAPI + Pydantic v2 |
| Motor Matemático | NumPy + SciPy |
| Deploy | Docker (multi-stage, non-root) |
| Porta | 5003 (retrocompatível) |
