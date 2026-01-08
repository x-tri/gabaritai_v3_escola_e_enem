# Portal da Escola - Redesign Completo

**Data:** 2026-01-08
**Status:** Aprovado para implementação

## Objetivo

Melhorar o Portal da Escola para ter as mesmas métricas do painel do administrador, excluindo:
- Ler/corrigir gabaritos
- Cadastrar escola
- Imprimir gabaritos

## Estrutura de Abas

```
[Visão Geral] [Resultados] [Turmas] [Alunos]
```

## Funcionalidades

### 1. Visão Geral (Dashboard)

**Cards de Estatísticas:**
- Total de Alunos
- Provas Realizadas
- Média de Acertos
- Turmas / Séries

**Ranking de Turmas:**
- Barras comparativas por turma
- Ordenado por média de acertos

**Desempenho por Área (TRI):**
- LC, CH, CN, MT
- Médias e faixas (Baixo/Médio/Alto)

**Destaques:**
- Top 5 alunos
- Alunos que precisam de atenção (abaixo de 50%)

### 2. Resultados (já existe - manter)

- Tabela de resultados com filtros
- Filtros hierárquicos: Série → Turma

### 3. Turmas

**Cards por Turma:**
- Nome da turma
- Quantidade de alunos
- Média de acertos
- TRI médio por área
- Botão "Ver Alunos"

**Modal Ver Alunos:**
- Header com média da turma
- Tabela com ranking (🥇🥈🥉)
- Colunas: Posição, Aluno, Matrícula, Acertos, LC, CH, CN, MT
- Indicadores: ▲ Acima | ─ Média | ▼ Abaixo

### 4. Alunos

**Lista com Busca:**
- Busca por nome/matrícula
- Filtros: Série, Turma
- Colunas: Aluno, Matrícula, Turma, Provas, Último resultado, Posição

**Modal Detalhes do Aluno:**
- Dados básicos + posição na turma
- Barras comparativas (aluno vs turma)
- Histórico de todas as provas
- Evolução (delta entre provas)

## Filtros Hierárquicos

- **Série**: Extraída automaticamente do nome da turma (ex: "1ª Série A" → "1ª Série")
- **Turma**: Letra da turma (A, B, C, etc.)

## Métricas Comparativas

- Posição do aluno na turma (ranking)
- Comparação com média da turma (▲ ─ ▼)
- Evolução temporal entre provas

## Exclusões (não implementar)

- Importar alunos CSV
- Reset de senha
- Imprimir gabaritos
- Excluir alunos

## API Endpoints Necessários

1. `GET /api/escola/dashboard` - Stats gerais + rankings
2. `GET /api/escola/turmas/:turma/alunos` - Alunos de uma turma com métricas
3. `GET /api/escola/alunos/:id/historico` - Histórico de provas do aluno
4. `GET /api/escola/series` - Lista de séries disponíveis
