"""
Teste real da API TRI V3 com dados de dois simulados (LC e MT).
Dados já corrigidos: 1 = acerto, 0 = erro.
Q1-Q45 = Linguagens (LC), Q46-Q90 = Matemática (MT).
Cada simulado é processado separadamente (regra inviolável).
"""

import json
import pandas as pd
import requests
import numpy as np

BASE = "http://localhost:5003"

# ═══════════════════════════════════════════════════════════════════════════════
# 1. CARREGAR E PREPARAR DADOS
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 80)
print("CARREGANDO DADOS DO EXCEL")
print("=" * 80)

df_raw = pd.read_excel('/home/ubuntu/Doissimulados.xlsx', header=None)

# A linha 0 é o header de áreas, linha 1 é o header de colunas
# Dados começam na linha 2
# Colunas: 0=i, 1=CPF/Nome, 2=Simulado, 3-47=Q1-Q45(LC), 48=NaN, 49-93=Q46-Q90(MT), 94=Nome

# Extrair dados a partir da linha 2
data = df_raw.iloc[2:].copy()
data.columns = range(len(data.columns))

# Separar por simulado
sim1 = data[data[2] == 'Simulado 1'].copy()
sim2 = data[data[2] == 'Simulado 2'].copy()

print(f"Simulado 1: {len(sim1)} alunos")
print(f"Simulado 2: {len(sim2)} alunos")

# Colunas de respostas:
# LC: colunas 3 a 47 (Q1-Q45)
# MT: colunas 49 a 93 (Q46-Q90)
LC_COLS = list(range(3, 48))   # 45 colunas
MT_COLS = list(range(49, 94))  # 45 colunas

def extrair_alunos_cientifico(df_sim, area_cols, simulado_label):
    """Extrai alunos no formato do motor científico (vetor binário)."""
    alunos = []
    for idx, row in df_sim.iterrows():
        nome = str(row[94]) if pd.notna(row[94]) else str(row[1])
        respostas = []
        for col in area_cols:
            val = row[col]
            respostas.append(int(val) if pd.notna(val) and val in [0, 1, '0', '1', 0.0, 1.0] else 0)
        alunos.append({
            "aluno_id": f"{simulado_label}_{int(row[0]):03d}",
            "nome": nome,
            "respostas": respostas
        })
    return alunos

def extrair_alunos_heuristico(df_sim, area_cols, gabarito_sintetico):
    """
    Extrai alunos no formato do motor heurístico (q1, q2, ...).
    Como os dados já são 0/1, criamos um gabarito onde a resposta correta é '1'
    e mapeamos: acerto (1) → resposta '1', erro (0) → resposta '0'.
    """
    alunos = []
    for idx, row in df_sim.iterrows():
        nome = str(row[94]) if pd.notna(row[94]) else str(row[1])
        aluno = {"id": f"h_{int(row[0]):03d}", "nome": nome}
        for i, col in enumerate(area_cols):
            val = row[col]
            # Se acertou (1), responde com o gabarito; se errou (0), responde diferente
            if pd.notna(val) and int(val) == 1:
                aluno[f"q{i+1}"] = gabarito_sintetico[str(i+1)]
            else:
                aluno[f"q{i+1}"] = "X"  # Resposta errada
        alunos.append(aluno)
    return alunos


# ═══════════════════════════════════════════════════════════════════════════════
# 2. TESTAR MOTOR CIENTÍFICO (o principal para dados binários)
# ═══════════════════════════════════════════════════════════════════════════════

resultados_todos = {}

for sim_label, df_sim in [("Simulado_1", sim1), ("Simulado_2", sim2)]:
    for area_label, area_cols, area_code in [("LC", LC_COLS, "LC"), ("MT", MT_COLS, "MT")]:
        print(f"\n{'=' * 80}")
        print(f"MOTOR CIENTÍFICO: {sim_label} × {area_label}")
        print(f"{'=' * 80}")

        alunos = extrair_alunos_cientifico(df_sim, area_cols, sim_label)
        
        # Verificar dados
        acertos_lista = [sum(a['respostas']) for a in alunos]
        print(f"N alunos: {len(alunos)}")
        print(f"N itens: {len(alunos[0]['respostas'])}")
        print(f"Acertos — mín: {min(acertos_lista)}, máx: {max(acertos_lista)}, "
              f"média: {np.mean(acertos_lista):.1f}, mediana: {np.median(acertos_lista):.0f}")

        payload = {
            "simulado_id": sim_label,
            "area": area_code,
            "ano_referencia": 2024,
            "c_fixo": 0.20,
            "alunos": alunos
        }

        r = requests.post(f"{BASE}/api/v3/calibrar-cientifico", json=payload)
        
        if r.status_code != 200:
            print(f"❌ ERRO {r.status_code}: {r.text[:500]}")
            continue

        data = r.json()
        diag = data['diagnostico']
        
        print(f"\n📊 DIAGNÓSTICO:")
        print(f"  b médio: {diag['b_medio']:.3f} (DP: {diag['b_desvio']:.3f})")
        print(f"  Itens saturados: {diag['itens_saturados']}")
        print(f"  Nota média: {diag['nota_media']:.1f}")
        print(f"  Nota mín: {diag['nota_min']:.1f} | Nota máx: {diag['nota_max']:.1f}")
        print(f"  Desvio padrão: {diag['nota_desvio']:.1f}")
        print(f"  % dentro do intervalo: {diag['pct_dentro_intervalo']}%")

        # Mostrar parâmetros dos itens (primeiros 10)
        print(f"\n📐 PARÂMETROS DOS ITENS (primeiros 10):")
        print(f"  {'Item':>4s}  {'a':>6s}  {'b':>7s}  {'c':>5s}  {'Taxa%':>6s}  {'Sat':>3s}")
        for p in data['parametros_itens'][:10]:
            print(f"  {p['item_index']:4d}  {p['a']:6.3f}  {p['b']:7.3f}  {p['c']:5.2f}  "
                  f"{p['taxa_acerto']*100:5.1f}%  {'⚠️' if p['saturado'] else '✅'}")

        # Mostrar resultados dos alunos (primeiros 15)
        print(f"\n👥 RESULTADOS DOS ALUNOS (primeiros 15):")
        print(f"  {'Nome':>35s}  {'Acertos':>7s}  {'θ':>7s}  {'SE':>6s}  {'Nota':>6s}  {'Estado':>12s}")
        for res in sorted(data['resultados_alunos'], key=lambda x: -x['nota_ancorada'])[:15]:
            print(f"  {res['nome'][:35]:>35s}  {res['acertos']:7d}  {res['theta']:7.3f}  "
                  f"{res['se']:6.3f}  {res['nota_ancorada']:6.1f}  {res['estado_tri']:>12s}")

        # Guardar resultados
        key = f"{sim_label}_{area_code}"
        resultados_todos[key] = data

        print(f"\n✅ {sim_label} × {area_label}: SUCESSO")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. TESTAR MOTOR HEURÍSTICO (compatibilidade V2)
# ═══════════════════════════════════════════════════════════════════════════════

resultados_heuristico = {}

# Gabarito sintético: como os dados já são 0/1, o gabarito é "1" para todas
gabarito_sintetico = {str(i): "1" for i in range(1, 46)}

for sim_label, df_sim in [("Simulado_1", sim1), ("Simulado_2", sim2)]:
    for area_label, area_cols, area_code in [("LC", LC_COLS, "LC"), ("MT", MT_COLS, "MT")]:
        print(f"\n{'=' * 80}")
        print(f"MOTOR HEURÍSTICO (V2): {sim_label} × {area_label}")
        print(f"{'=' * 80}")

        alunos = extrair_alunos_heuristico(df_sim, area_cols, gabarito_sintetico)

        payload = {
            "alunos": alunos,
            "gabarito": gabarito_sintetico,
            "areas_config": {area_code: [1, 45]}
        }

        r = requests.post(f"{BASE}/api/calcular-tri", json=payload)
        
        if r.status_code != 200:
            print(f"❌ ERRO {r.status_code}: {r.text[:500]}")
            continue

        data = r.json()
        print(f"Status: {data['status']} | Total: {data['total_alunos']}")
        print(f"Prova: TRI médio={data['prova_analysis']['tri_medio']:.1f} | "
              f"TRI mín={data['prova_analysis']['tri_min']:.1f} | "
              f"TRI máx={data['prova_analysis']['tri_max']:.1f}")

        # Mostrar primeiros 15 resultados
        area_key = area_code.lower()
        sorted_res = sorted(data['resultados'], key=lambda x: -x.get(f'tri_{area_key}', 0))
        print(f"\n👥 TOP 15 ALUNOS:")
        print(f"  {'Nome':>35s}  {'Acertos':>7s}  {'TRI':>6s}")
        for res in sorted_res[:15]:
            print(f"  {res['nome'][:35]:>35s}  {res.get(f'{area_key}_acertos', 0):7d}  "
                  f"{res.get(f'tri_{area_key}', 0):6.1f}")

        key = f"{sim_label}_{area_code}"
        resultados_heuristico[key] = data
        print(f"\n✅ {sim_label} × {area_label} (Heurístico): SUCESSO")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. COMPARAÇÃO ENTRE MOTORES
# ═══════════════════════════════════════════════════════════════════════════════
print(f"\n\n{'=' * 80}")
print("COMPARAÇÃO: MOTOR CIENTÍFICO vs HEURÍSTICO")
print(f"{'=' * 80}")

for key in resultados_todos:
    sim_label, area_code = key.rsplit('_', 1)
    area_key = area_code.lower()
    
    cient = resultados_todos[key]
    heur = resultados_heuristico.get(key)
    
    if not heur:
        continue
    
    print(f"\n--- {sim_label} × {area_code} ---")
    
    # Mapear por nome para comparar
    cient_map = {r['nome']: r['nota_ancorada'] for r in cient['resultados_alunos']}
    heur_map = {r['nome']: r.get(f'tri_{area_key}', 0) for r in heur['resultados']}
    
    nomes_comuns = set(cient_map.keys()) & set(heur_map.keys())
    
    if nomes_comuns:
        diffs = []
        print(f"  {'Nome':>35s}  {'Científ.':>8s}  {'Heuríst.':>8s}  {'Diff':>6s}")
        for nome in sorted(nomes_comuns, key=lambda n: -cient_map[n])[:10]:
            c = cient_map[nome]
            h = heur_map[nome]
            diff = c - h
            diffs.append(diff)
            print(f"  {nome[:35]:>35s}  {c:8.1f}  {h:8.1f}  {diff:+6.1f}")
        
        diffs = np.array(diffs)
        print(f"\n  Diferença média: {np.mean(diffs):+.1f} | Abs média: {np.mean(np.abs(diffs)):.1f} | "
              f"Máx abs: {np.max(np.abs(diffs)):.1f}")

print(f"\n{'=' * 80}")
print("🎉 TESTE REAL COMPLETO!")
print(f"{'=' * 80}")
