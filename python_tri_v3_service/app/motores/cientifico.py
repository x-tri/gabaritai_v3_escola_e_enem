"""
Motor Científico TRI — Baseado no calibrar_tri.py (MIRT/XTRI Skill).

Implementa TRI 2PL real com:
- Calibração MML (Marginal Maximum Likelihood) via L-BFGS-B
- Estimação EAP (Expected A Posteriori) com prior N(0,1)
- Ancoragem percentil na tabela de referência oficial do ENEM

Regras invioláveis:
1. Calibração independente por simulado × área (NUNCA misturar)
2. Parâmetro c fixo em 0.20 (5 alternativas) para N < 500
3. Ancoragem CDF: nota = ref_min_K + norm.cdf(θ) × (ref_max_K − ref_min_K), 1 decimal
"""

import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm
from typing import Dict, List, Tuple, Optional, Any

from ..tabela_referencia import TabelaReferenciaTRI, TRI_MAXIMA_OFICIAL


# ════════════════════════════════════════════════════════════════════════════════
# MODELO 3PL / 2PL
# ════════════════════════════════════════════════════════════════════════════════

def P(theta: np.ndarray, a: float, b: float, c: float = 0.20) -> np.ndarray:
    """Probabilidade de acerto — modelo 3PL (c fixo = acerto casual)."""
    return c + (1 - c) / (1 + np.exp(-a * (theta - b)))


def _neg_log_lik_item(
    params: np.ndarray,
    responses: np.ndarray,
    c: float,
    theta_grid: np.ndarray,
    weights: np.ndarray
) -> float:
    """Verossimilhança marginal negativa para um item."""
    a, b = params
    if a <= 0.01:
        return 1e10
    ll = 0.0
    for r in responses:
        prob = P(theta_grid, a, b, c)
        prob = np.clip(prob, 1e-9, 1 - 1e-9)
        lk = np.where(r == 1, prob, 1 - prob)
        ll += np.log(np.sum(weights * lk) + 1e-15)
    return -ll


def calibrar_itens(
    resp_matrix: np.ndarray,
    c: float = 0.20,
    n_quad: int = 41
) -> List[Dict[str, Any]]:
    """
    Calibra parâmetros a, b de cada item via MML com quadratura gaussiana.

    Args:
        resp_matrix: ndarray (N_alunos × N_itens), valores 0/1
        c: Parâmetro de acerto casual fixo (0.20 para 5 alternativas)
        n_quad: Número de pontos de quadratura

    Returns:
        Lista de dicts {a, b, c, taxa_acerto, saturado}
    """
    theta_grid = np.linspace(-4, 4, n_quad)
    weights = norm.pdf(theta_grid, 0, 1)
    weights /= weights.sum()

    params = []
    for j in range(resp_matrix.shape[1]):
        responses = resp_matrix[:, j]
        p_obs = np.clip(responses.mean(), c + 0.01, 0.99)
        b_init = -np.log((1 - c) / (p_obs - c) - 1) if p_obs > c else 2.0

        res = minimize(
            _neg_log_lik_item,
            x0=[1.0, b_init],
            args=(responses, c, theta_grid, weights),
            method='L-BFGS-B',
            bounds=[(0.3, 4.0), (-4.0, 4.0)],
            options={'maxiter': 500, 'ftol': 1e-9}
        )
        a_est, b_est = res.x
        params.append({
            'a': round(float(a_est), 4),
            'b': round(float(b_est), 4),
            'c': c,
            'taxa_acerto': round(float(responses.mean()), 4),
            'saturado': b_est >= 3.9,
        })
    return params


def eap_theta(
    responses: np.ndarray,
    item_params: List[Dict[str, float]],
    n_quad: int = 41
) -> Tuple[float, float]:
    """
    Estima θ via EAP (Expected A Posteriori) com prior N(0,1).

    Args:
        responses: Vetor de respostas de um aluno (0/1)
        item_params: Lista de dicts com 'a', 'b', 'c'
        n_quad: Número de pontos de quadratura

    Returns:
        (theta_eap, se_eap)
    """
    theta_grid = np.linspace(-4, 4, n_quad)
    prior = norm.pdf(theta_grid, 0, 1)

    lk = np.ones(n_quad)
    for j, p in enumerate(item_params):
        prob = P(theta_grid, p['a'], p['b'], p['c'])
        prob = np.clip(prob, 1e-9, 1 - 1e-9)
        lk *= np.where(responses[j] == 1, prob, 1 - prob)

    posterior = lk * prior
    s = posterior.sum()
    if s < 1e-300:
        return 0.0, 1.0
    posterior /= s
    theta_eap = float(np.sum(theta_grid * posterior))
    se_eap = float(np.sqrt(np.sum((theta_grid - theta_eap) ** 2 * posterior)))
    return round(theta_eap, 6), round(se_eap, 4)


# ════════════════════════════════════════════════════════════════════════════════
# ANCORAGEM NA TABELA DE REFERÊNCIA
# ════════════════════════════════════════════════════════════════════════════════

def ancorar_notas(
    thetas: List[Dict[str, Any]],
    tabela: TabelaReferenciaTRI,
    area: str
) -> List[Dict[str, Any]]:
    """
    Mapeia θ → nota dentro do intervalo [Min_K, Max_K] da tabela de referência.

    Lógica:
      - Para K acertos, a referência define [ref_min_K, ref_max_K]
      - A CDF da N(0,1) aplicada ao θ posiciona o aluno dentro do intervalo
      - nota = ref_min_K + norm.cdf(θ) × (ref_max_K - ref_min_K)
      - Intervalo colapsado (min == max) → nota fixa (ex: 45 acertos MT = 987.6)
      - Teto absoluto por área via TRI_MAXIMA_OFICIAL (escala histórica)
      - 1 casa decimal (padrão ENEM)
      - θ igual → nota igual; θ muito próximos podem arredondar para mesma nota

    Args:
        thetas: Lista de dicts com 'aluno_id', 'acertos', 'theta', 'se'
        tabela: Tabela de referência oficial
        area: Área (LC, CH, CN, MT)

    Returns:
        Lista de dicts com 'nota_ancorada' adicionado
    """
    resultados = []

    for t in thetas:
        k = t['acertos']
        theta_i = t['theta']

        ref = tabela.obter(area, k)
        ref_min = ref['tri_min']
        ref_med = ref['tri_med']
        ref_max = ref['tri_max']

        if ref_min == ref_max:
            nota = ref_med
        else:
            pct = float(norm.cdf(theta_i))
            nota = ref_min + pct * (ref_max - ref_min)

        # Teto absoluto por área (escala histórica, nunca 1000)
        tri_maxima = TRI_MAXIMA_OFICIAL.get(area, 1000.0)
        nota = min(nota, tri_maxima)

        resultado = {**t, 'nota_ancorada': round(float(nota), 1)}
        resultados.append(resultado)

    return resultados


# ════════════════════════════════════════════════════════════════════════════════
# ESTADO TRI (XTRI)
# ════════════════════════════════════════════════════════════════════════════════

def estado_tri(nota: float) -> str:
    """Classifica a nota TRI em estado para o XTRI Student Office."""
    if nota >= 650:
        return 'CHAMPION'
    elif nota >= 580:
        return 'ON_FIRE'
    elif nota >= 480:
        return 'STUDYING'
    elif nota >= 380:
        return 'NEEDS_REVIEW'
    else:
        return 'NEW_STUDENT'


# ════════════════════════════════════════════════════════════════════════════════
# PIPELINE COMPLETO: CALIBRAR + ESTIMAR + ANCORAR
# ════════════════════════════════════════════════════════════════════════════════

def pipeline_cientifico(
    alunos: List[Dict[str, Any]],
    area: str,
    tabela: TabelaReferenciaTRI,
    c_fixo: float = 0.20,
) -> Dict[str, Any]:
    """
    Executa o pipeline completo de calibração científica para UMA área.

    Regra inviolável: cada combinação simulado × área é um modelo separado.

    Args:
        alunos: Lista de dicts com 'aluno_id', 'nome', 'respostas' (lista de 0/1)
        area: Área (LC, CH, CN, MT)
        tabela: Tabela de referência oficial
        c_fixo: Parâmetro c fixo (0.20 para 5 alternativas)

    Returns:
        Dict com 'parametros_itens', 'resultados_alunos', 'diagnostico'
    """
    # Montar matriz de respostas (N_alunos × N_itens)
    resp_matrix = np.array([a['respostas'] for a in alunos], dtype=int)
    n_alunos, n_itens = resp_matrix.shape

    # 1. Calibrar itens
    item_params = calibrar_itens(resp_matrix, c=c_fixo)

    # Estatísticas dos parâmetros
    b_vals = [p['b'] for p in item_params]
    n_saturados = sum(1 for b in b_vals if b >= 3.9)

    # 2. Estimar θ EAP para cada aluno
    thetas = []
    for i, aluno in enumerate(alunos):
        t, se = eap_theta(resp_matrix[i], item_params)
        acertos = int(resp_matrix[i].sum())
        thetas.append({
            'aluno_id': aluno['aluno_id'],
            'nome': aluno.get('nome', ''),
            'acertos': acertos,
            'theta': t,
            'se': se,
        })

    # 3. Ancorar notas na tabela de referência
    resultados = ancorar_notas(thetas, tabela, area)

    # 4. Classificar estados TRI
    for r in resultados:
        r['estado_tri'] = estado_tri(r['nota_ancorada'])

    # 5. Diagnóstico
    notas = [r['nota_ancorada'] for r in resultados]
    diagnostico = {
        'n_alunos': n_alunos,
        'n_itens': n_itens,
        'b_medio': round(float(np.mean(b_vals)), 3),
        'b_desvio': round(float(np.std(b_vals)), 3),
        'itens_saturados': n_saturados,
        'nota_media': round(float(np.mean(notas)), 1),
        'nota_min': round(float(np.min(notas)), 1),
        'nota_max': round(float(np.max(notas)), 1),
        'nota_desvio': round(float(np.std(notas)), 1),
    }

    # Verificar % dentro do intervalo da tabela
    dentro = 0
    for r in resultados:
        ref = tabela.obter(area, r['acertos'])
        if ref['tri_min'] <= r['nota_ancorada'] <= ref['tri_max']:
            dentro += 1
    diagnostico['pct_dentro_intervalo'] = round(dentro / len(resultados) * 100, 1) if resultados else 0

    return {
        'parametros_itens': item_params,
        'resultados_alunos': resultados,
        'diagnostico': diagnostico,
    }


def estimar_theta_individual(
    respostas: List[int],
    parametros_itens: List[Dict[str, float]],
    area: str,
    tabela: TabelaReferenciaTRI,
) -> Dict[str, Any]:
    """
    Estima nota de UM aluno usando parâmetros já calibrados.
    Ideal para alunos retardatários ou processamento assíncrono via OMR.

    Args:
        respostas: Vetor binário (0/1) de respostas
        parametros_itens: Lista de dicts com 'a', 'b', 'c'
        area: Área (LC, CH, CN, MT)
        tabela: Tabela de referência oficial

    Returns:
        Dict com acertos, theta, se, nota_ancorada, estado_tri
    """
    resp_array = np.array(respostas, dtype=int)
    acertos = int(resp_array.sum())

    t, se = eap_theta(resp_array, parametros_itens)

    # Para estimação individual, usar mediana da referência (sem grupo para rank)
    ref = tabela.obter(area, acertos)
    nota = ref['tri_med']

    # Ajustar dentro do intervalo baseado no theta
    # Se theta > 0, tende para tri_max; se < 0, tende para tri_min
    if ref['tri_max'] > ref['tri_min']:
        # Normalizar theta para [0, 1] usando CDF normal
        pct = float(norm.cdf(t))
        nota = ref['tri_min'] + pct * (ref['tri_max'] - ref['tri_min'])

    # Aplicar teto oficial
    tri_maxima = TRI_MAXIMA_OFICIAL.get(area, 1000.0)
    nota = min(nota, tri_maxima)

    return {
        'acertos': acertos,
        'theta': t,
        'se': se,
        'nota_ancorada': round(nota, 1),
        'estado_tri': estado_tri(nota),
    }
