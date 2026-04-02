"""
Testes de integração para a API TRI V3.
Testa os 3 endpoints principais com dados sintéticos.
"""

import json
import random
import requests

BASE = "http://localhost:5003"

# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 1: Health Check
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("TESTE 1: Health Check")
print("=" * 70)
r = requests.get(f"{BASE}/health")
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))
assert r.status_code == 200
assert r.json()["tabela_carregada"] is True
print("✅ PASSOU\n")


# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 2: Motor Heurístico (compatibilidade V2)
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("TESTE 2: Motor Heurístico — /api/calcular-tri (compat. V2)")
print("=" * 70)

# Gerar gabarito de 45 questões (LC)
random.seed(42)
opcoes = ['A', 'B', 'C', 'D', 'E']
gabarito = {str(i): random.choice(opcoes) for i in range(1, 46)}

# Gerar 30 alunos com diferentes perfis
alunos = []
for idx in range(30):
    aluno = {"id": f"aluno_{idx:03d}", "nome": f"Aluno {idx}"}
    # Perfil: alunos mais fortes acertam mais
    skill = 0.3 + (idx / 30) * 0.5  # 30% a 80% de acerto
    for q in range(1, 46):
        if random.random() < skill:
            aluno[f"q{q}"] = gabarito[str(q)]  # Acerta
        else:
            erradas = [o for o in opcoes if o != gabarito[str(q)]]
            aluno[f"q{q}"] = random.choice(erradas)  # Erra
    alunos.append(aluno)

payload = {
    "alunos": alunos,
    "gabarito": gabarito,
    "areas_config": {"LC": [1, 45]}
}

r = requests.post(f"{BASE}/api/calcular-tri", json=payload)
print(f"Status: {r.status_code}")
data = r.json()
print(f"Total alunos: {data.get('total_alunos')}")
print(f"Prova analysis: {json.dumps(data.get('prova_analysis', {}), indent=2)}")

# Mostrar amostra de resultados
if data.get('resultados'):
    print(f"\nAmostra de resultados (primeiros 5):")
    for res in data['resultados'][:5]:
        print(f"  {res['nome']}: TRI_LC={res.get('tri_lc', '?')} | "
              f"Acertos={res.get('lc_acertos', '?')} | "
              f"TRI_Geral={res.get('tri_geral', '?')}")

    # Validações
    for res in data['resultados']:
        tri = res.get('tri_lc', 0)
        assert 200 <= tri <= 900, f"TRI fora do range: {tri} para {res['nome']}"

    print(f"\n  Menor TRI: {min(r.get('tri_lc', 0) for r in data['resultados']):.1f}")
    print(f"  Maior TRI: {max(r.get('tri_lc', 0) for r in data['resultados']):.1f}")

assert r.status_code == 200
assert data['status'] == 'sucesso'
assert data['total_alunos'] == 30
print("✅ PASSOU\n")


# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 3: Motor Científico (MML + EAP)
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("TESTE 3: Motor Científico — /api/v3/calibrar-cientifico")
print("=" * 70)

# Gerar 50 alunos com 45 itens binários
random.seed(123)
alunos_cient = []
for idx in range(50):
    skill = random.gauss(0, 1)  # θ real ~ N(0,1)
    respostas = []
    for j in range(45):
        # Simular dificuldade variada
        b_item = -2 + (j / 45) * 4  # de -2 a +2
        prob = 0.20 + 0.80 / (1 + 2.718 ** (-1.2 * (skill - b_item)))
        respostas.append(1 if random.random() < prob else 0)
    alunos_cient.append({
        "aluno_id": f"uuid-{idx:03d}",
        "nome": f"Aluno Científico {idx}",
        "respostas": respostas
    })

payload_cient = {
    "simulado_id": "sim_teste_v3",
    "area": "CH",
    "ano_referencia": 2024,
    "c_fixo": 0.20,
    "alunos": alunos_cient
}

r = requests.post(f"{BASE}/api/v3/calibrar-cientifico", json=payload_cient)
print(f"Status: {r.status_code}")
data = r.json()
print(f"Simulado: {data.get('simulado_id')} | Área: {data.get('area')}")
print(f"N alunos: {data.get('n_alunos')} | N itens: {data.get('n_itens')}")
print(f"Diagnóstico: {json.dumps(data.get('diagnostico', {}), indent=2)}")

# Mostrar amostra de parâmetros calibrados
if data.get('parametros_itens'):
    print(f"\nAmostra de parâmetros (primeiros 5 itens):")
    for p in data['parametros_itens'][:5]:
        print(f"  Item {p['item_index']}: a={p['a']:.3f} b={p['b']:.3f} "
              f"c={p['c']:.2f} taxa={p['taxa_acerto']:.2%} sat={p['saturado']}")

# Mostrar amostra de resultados
if data.get('resultados_alunos'):
    print(f"\nAmostra de resultados (primeiros 5):")
    for res in data['resultados_alunos'][:5]:
        print(f"  {res['nome']}: θ={res['theta']:.3f} ± {res['se']:.3f} | "
              f"Nota={res['nota_ancorada']:.1f} | "
              f"Acertos={res['acertos']} | "
              f"Estado={res['estado_tri']}")

    notas = [r['nota_ancorada'] for r in data['resultados_alunos']]
    print(f"\n  Nota mín: {min(notas):.1f} | Nota máx: {max(notas):.1f}")
    print(f"  % dentro do intervalo: {data['diagnostico']['pct_dentro_intervalo']}%")

assert r.status_code == 200
assert data['status'] == 'sucesso'
print("✅ PASSOU\n")


# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 4: Estimação Individual (θ com parâmetros pré-calibrados)
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("TESTE 4: Estimação Individual — /api/v3/estimar-theta")
print("=" * 70)

# Usar parâmetros calibrados do teste anterior
params_calibrados = data['parametros_itens']

# Simular um aluno retardatário com 30 acertos de 45
respostas_individual = [1] * 30 + [0] * 15

payload_ind = {
    "area": "CH",
    "ano_referencia": 2024,
    "parametros_itens": [
        {"a": p['a'], "b": p['b'], "c": p['c']}
        for p in params_calibrados
    ],
    "respostas": respostas_individual
}

r = requests.post(f"{BASE}/api/v3/estimar-theta", json=payload_ind)
print(f"Status: {r.status_code}")
data_ind = r.json()
print(f"Acertos: {data_ind['acertos']}")
print(f"θ: {data_ind['theta']:.3f} ± {data_ind['se']:.3f}")
print(f"Nota ancorada: {data_ind['nota_ancorada']:.1f}")
print(f"Estado TRI: {data_ind['estado_tri']}")

assert r.status_code == 200
assert 200 <= data_ind['nota_ancorada'] <= 900
print("✅ PASSOU\n")


# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 5: Tabela de Referência
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("TESTE 5: Tabela de Referência — /api/v3/referencias/MT")
print("=" * 70)

r = requests.get(f"{BASE}/api/v3/referencias/MT")
print(f"Status: {r.status_code}")
data_ref = r.json()
print(f"Área: {data_ref['area']} | Registros: {data_ref['total_registros']}")
if data_ref.get('dados'):
    print(f"  0 acertos: {data_ref['dados'][0]}")
    print(f"  45 acertos: {data_ref['dados'][-1]}")

assert r.status_code == 200
print("✅ PASSOU\n")


# ═══════════════════════════════════════════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("🎉 TODOS OS 5 TESTES PASSARAM!")
print("=" * 70)
