"""
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    XTRI ENGINE API — TRI V3 (FastAPI)                        ║
║                                                                              ║
║  API híbrida com dois motores de estimação TRI:                              ║
║  • Motor Heurístico: Rápido, compatível com V2 (coerência pedagógica)       ║
║  • Motor Científico: MML + EAP + Ancoragem (calibração real)                ║
║                                                                              ║
║  Porta: 5003 (retrocompatível com V2)                                        ║
║                                                                              ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import time
import traceback
import numpy as np
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import (
    RequestCalcularTRI,
    ResponseCalcularTRI,
    RequestCalibrarCientifico,
    ResponseCalibrarCientifico,
    ItemParametros,
    ResultadoAlunoCientifico,
    RequestEstimarTheta,
    ResponseEstimarTheta,
)
from .tabela_referencia import TabelaReferenciaTRI
from .motores.heuristico import processar_turma
from .motores.cientifico import (
    pipeline_cientifico,
    estimar_theta_individual,
)


# ════════════════════════════════════════════════════════════════════════════════
# STARTUP / SHUTDOWN
# ════════════════════════════════════════════════════════════════════════════════

tabela: TabelaReferenciaTRI = None  # type: ignore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carrega a tabela de referência na inicialização."""
    global tabela
    print("=" * 80)
    print("  XTRI ENGINE API — TRI V3 (FastAPI)")
    print("=" * 80)

    try:
        tabela = TabelaReferenciaTRI()
        tabela.validar()
        info = tabela.info()
        print(f"  Tabela de referência carregada: {info['areas']}")
        print(f"  Acertos por área: {info['acertos_por_area']}")
        print(f"  Limites oficiais: {info['limites_oficiais']}")
    except Exception as e:
        print(f"  ERRO ao carregar tabela: {e}")
        tabela = None

    print(f"  Python: {sys.version}")
    print(f"  Servidor: http://0.0.0.0:5003")
    print("=" * 80)

    yield  # A aplicação roda aqui

    print("Encerrando XTRI Engine API...")


# ════════════════════════════════════════════════════════════════════════════════
# APP
# ════════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="XTRI Engine API",
    description="API de estimação TRI para simulados ENEM — Motor Heurístico + Científico",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS aberto (mesmo comportamento do Flask V2)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware para converter tipos numpy no JSON de resposta
def convert_numpy(obj: Any) -> Any:
    """Converte recursivamente tipos numpy para Python nativos."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(item) for item in obj]
    return obj


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINTS — SAÚDE E DEBUG
# ════════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    """Endpoint de saúde (compatível com V2 e Docker healthcheck)."""
    return {
        "status": "online",
        "service": "xtri_engine_api",
        "version": "3.0.0",
        "motores": ["heuristico_v2", "cientifico_mirt"],
        "tabela_carregada": tabela is not None,
    }


@app.get("/api/debug")
async def debug():
    """Endpoint de debug para verificar configuração."""
    return {
        "service": "XTRI Engine API — TRI V3",
        "version": "3.0.0",
        "tabela_carregada": tabela is not None,
        "tabela_info": tabela.info() if tabela else None,
        "python_version": sys.version,
        "motores_disponiveis": ["heuristico_v2", "cientifico_mirt"],
    }


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINT — COMPATIBILIDADE V2 (Motor Heurístico)
# ════════════════════════════════════════════════════════════════════════════════

@app.post("/api/calcular-tri", response_model=ResponseCalcularTRI)
async def calcular_tri(request: Request):
    """
    Calcula TRI com motor heurístico (coerência pedagógica).

    Drop-in replacement para a rota V2 do Flask.
    O Node.js chama essa rota e recebe o mesmo JSON de antes.
    """
    if tabela is None:
        raise HTTPException(
            status_code=500,
            detail="Tabela de referência TRI não carregada"
        )

    try:
        # Aceitar o JSON raw para máxima compatibilidade com V2
        data = await request.json()

        if not data or 'alunos' not in data or 'gabarito' not in data:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "erro",
                    "mensagem": "Dados inválidos. Necessário: alunos, gabarito"
                }
            )

        alunos_raw = data['alunos']
        gabarito_raw = data['gabarito']
        areas_config_raw = data.get('areas_config', {
            'LC': [1, 45],
            'CH': [46, 90],
            'CN': [1, 45],
            'MT': [46, 90],
        })

        # Converter gabarito (aceita lista ou dicionário)
        if isinstance(gabarito_raw, list):
            gabarito = {str(i + 1): v for i, v in enumerate(gabarito_raw)}
        else:
            gabarito = {str(k): v for k, v in gabarito_raw.items()}

        # Converter areas_config de list para tuple
        areas_config = {k: tuple(v) for k, v in areas_config_raw.items()}

        # Converter alunos do formato lista para formato qN (compatível com V2)
        alunos = []
        for aluno in alunos_raw:
            aluno_conv = {
                'id': aluno.get('id', ''),
                'nome': aluno.get('nome', ''),
            }

            if 'respostas' in aluno and isinstance(aluno['respostas'], list):
                for i, resp in enumerate(aluno['respostas']):
                    aluno_conv[f'q{i + 1}'] = resp if resp else ''
            else:
                for key, val in aluno.items():
                    if key.startswith('q') or key in [
                        'id', 'nome', 'studentNumber', 'studentName', 'turma'
                    ]:
                        aluno_conv[key] = val

            alunos.append(aluno_conv)

        t0 = time.time()
        print(f"\n[TRI V3] Processando {len(alunos)} alunos (motor heurístico)...")
        print(f"[TRI V3] Gabarito: {len(gabarito)} questões | Áreas: {list(areas_config.keys())}")

        # Processar com motor heurístico
        prova_analysis, resultados = processar_turma(
            alunos=alunos,
            gabarito=gabarito,
            areas_config=areas_config,
            tabela=tabela,
        )

        elapsed = time.time() - t0
        print(f"[TRI V3] Concluído em {elapsed:.2f}s | {len(resultados)} resultados")

        # Converter tipos numpy para JSON
        return JSONResponse(content=convert_numpy({
            "status": "sucesso",
            "total_alunos": len(alunos),
            "prova_analysis": prova_analysis,
            "resultados": resultados,
        }))

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[TRI V3] ERRO: {error_trace}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "erro",
                "mensagem": str(e),
                "trace": error_trace,
            }
        )


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINT — MOTOR CIENTÍFICO (MML + EAP)
# ════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v3/calibrar-cientifico", response_model=ResponseCalibrarCientifico)
async def calibrar_cientifico(payload: RequestCalibrarCientifico):
    """
    Calibra itens e estima notas TRI usando modelo 2PL real.

    Ideal para:
    - Fechamento de simulados oficiais
    - Geração de relatórios pedagógicos detalhados
    - Alimentação do banco de itens com parâmetros a, b, c

    Regra inviolável: cada combinação simulado × área é um modelo separado.
    """
    if tabela is None:
        raise HTTPException(
            status_code=500,
            detail="Tabela de referência TRI não carregada"
        )

    area = payload.area.upper()
    if area not in ['LC', 'CH', 'CN', 'MT']:
        raise HTTPException(
            status_code=400,
            detail=f"Área inválida: {area}. Esperado: LC, CH, CN ou MT"
        )

    if len(payload.alunos) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Mínimo de 10 alunos para calibração científica. Recebido: {len(payload.alunos)}"
        )

    # Verificar consistência do número de itens
    n_itens_esperado = len(payload.alunos[0].respostas)
    for a in payload.alunos:
        if len(a.respostas) != n_itens_esperado:
            raise HTTPException(
                status_code=400,
                detail=f"Aluno {a.aluno_id} tem {len(a.respostas)} respostas, esperado {n_itens_esperado}"
            )

    t0 = time.time()
    print(f"\n[TRI V3] Calibração científica: {payload.simulado_id} × {area}")
    print(f"[TRI V3] N={len(payload.alunos)} alunos, {n_itens_esperado} itens, c={payload.c_fixo}")

    try:
        # Converter para formato esperado pelo motor
        alunos_motor = [
            {
                'aluno_id': a.aluno_id,
                'nome': a.nome or '',
                'respostas': a.respostas,
            }
            for a in payload.alunos
        ]

        # Executar pipeline
        resultado = pipeline_cientifico(
            alunos=alunos_motor,
            area=area,
            tabela=tabela,
            c_fixo=payload.c_fixo,
        )

        elapsed = time.time() - t0
        diag = resultado['diagnostico']
        print(f"[TRI V3] Concluído em {elapsed:.2f}s")
        print(f"[TRI V3] b_médio={diag['b_medio']}, saturados={diag['itens_saturados']}")
        print(f"[TRI V3] Nota média={diag['nota_media']}, {diag['pct_dentro_intervalo']}% no intervalo")

        # Montar resposta tipada
        parametros = [
            ItemParametros(
                item_index=i,
                a=p['a'],
                b=p['b'],
                c=p['c'],
                taxa_acerto=p['taxa_acerto'],
                saturado=p['saturado'],
            )
            for i, p in enumerate(resultado['parametros_itens'])
        ]

        resultados_alunos = [
            ResultadoAlunoCientifico(
                aluno_id=r['aluno_id'],
                nome=r.get('nome', ''),
                acertos=r['acertos'],
                theta=r['theta'],
                se=r['se'],
                nota_ancorada=r['nota_ancorada'],
                estado_tri=r['estado_tri'],
            )
            for r in resultado['resultados_alunos']
        ]

        return ResponseCalibrarCientifico(
            status="sucesso",
            simulado_id=payload.simulado_id,
            area=area,
            n_alunos=len(payload.alunos),
            n_itens=n_itens_esperado,
            parametros_itens=parametros,
            resultados_alunos=resultados_alunos,
            diagnostico=resultado['diagnostico'],
        )

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[TRI V3] ERRO na calibração: {error_trace}")
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINT — ESTIMAÇÃO RÁPIDA COM PARÂMETROS PRÉ-CALIBRADOS
# ════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v3/estimar-theta", response_model=ResponseEstimarTheta)
async def estimar_theta(payload: RequestEstimarTheta):
    """
    Estima nota de UM aluno usando parâmetros de itens já calibrados.

    Ideal para:
    - Alunos retardatários (prova já calibrada)
    - Processamento assíncrono de cartões-resposta via OMR
    - Recálculo rápido sem recalibrar toda a turma
    """
    if tabela is None:
        raise HTTPException(
            status_code=500,
            detail="Tabela de referência TRI não carregada"
        )

    area = payload.area.upper()
    if area not in ['LC', 'CH', 'CN', 'MT']:
        raise HTTPException(
            status_code=400,
            detail=f"Área inválida: {area}"
        )

    if len(payload.respostas) != len(payload.parametros_itens):
        raise HTTPException(
            status_code=400,
            detail=f"Número de respostas ({len(payload.respostas)}) != número de itens ({len(payload.parametros_itens)})"
        )

    # Converter parâmetros para formato do motor
    params = [
        {'a': p.a, 'b': p.b, 'c': p.c}
        for p in payload.parametros_itens
    ]

    resultado = estimar_theta_individual(
        respostas=payload.respostas,
        parametros_itens=params,
        area=area,
        tabela=tabela,
    )

    return ResponseEstimarTheta(**resultado)


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINT — ADAPTADOR V2→CIENTÍFICO (drop-in replacement)
# ════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v3/calcular-tri-cientifico", response_model=ResponseCalcularTRI)
async def calcular_tri_cientifico(request: Request):
    """
    Recebe dados no formato V2 (letras + gabarito + areas_config),
    converte para binário, roda o motor científico por área,
    e retorna no mesmo formato que o heurístico.

    Drop-in replacement: no Express, troque apenas a URL:
      /api/calcular-tri → /api/v3/calcular-tri-cientifico
    """
    if tabela is None:
        raise HTTPException(
            status_code=500,
            detail="Tabela de referência TRI não carregada"
        )

    try:
        data = await request.json()

        if not data or 'alunos' not in data or 'gabarito' not in data:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "erro",
                    "mensagem": "Dados inválidos. Necessário: alunos, gabarito"
                }
            )

        alunos_raw = data['alunos']
        gabarito_raw = data['gabarito']
        areas_config_raw = data.get('areas_config', {
            'LC': [1, 45],
            'CH': [46, 90],
            'CN': [1, 45],
            'MT': [46, 90],
        })

        # ─── Converter gabarito (aceita lista ou dicionário) ───
        if isinstance(gabarito_raw, list):
            gabarito = {str(i + 1): v for i, v in enumerate(gabarito_raw)}
        else:
            gabarito = {str(k): v for k, v in gabarito_raw.items()}

        # ─── Normalizar nomes de área para códigos (CN, MT, LC, CH) ───
        area_mapping = {
            'LC': 'LC', 'Linguagens e Códigos': 'LC', 'Linguagens': 'LC',
            'CH': 'CH', 'Ciências Humanas': 'CH',
            'CN': 'CN', 'Ciências da Natureza': 'CN',
            'MT': 'MT', 'Matemática': 'MT',
        }
        areas_config: Dict[str, tuple] = {}
        for area_name, range_val in areas_config_raw.items():
            code = area_mapping.get(area_name, area_name.upper())
            if code in ['LC', 'CH', 'CN', 'MT']:
                areas_config[code] = tuple(range_val)

        if not areas_config:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "erro",
                    "mensagem": f"areas_config inválido. Recebido: {list(areas_config_raw.keys())}. "
                                "Esperado: LC/CH/CN/MT ou nomes por extenso"
                }
            )

        # ─── Converter alunos do formato V2 (letras) para campos qN ───
        alunos = []
        for aluno in alunos_raw:
            # Aceitar 'id' ou 'nome' como identificador
            aluno_id = aluno.get('id', '') or aluno.get('nome', '')
            aluno_conv = {
                'id': aluno_id,
                'nome': aluno.get('nome', ''),
            }
            if 'respostas' in aluno and isinstance(aluno['respostas'], list):
                for i, resp in enumerate(aluno['respostas']):
                    aluno_conv[f'q{i + 1}'] = resp if resp else ''
            else:
                for key, val in aluno.items():
                    if key.startswith('q') or key in [
                        'id', 'nome', 'studentNumber', 'studentName', 'turma'
                    ]:
                        aluno_conv[key] = val
            alunos.append(aluno_conv)

        # ─── Detectar se questões no aluno são q1-qN mas areas_config é [91,135] ───
        # Se o aluno tem q1 mas não q91, as respostas já vieram fatiadas pelo Express
        primeiro_aluno = alunos[0] if alunos else {}
        q_keys_aluno = sorted([int(k[1:]) for k in primeiro_aluno if k.startswith('q') and k[1:].isdigit()])
        max_q_aluno = max(q_keys_aluno) if q_keys_aluno else 0
        n_questoes_aluno = len(q_keys_aluno)
        n_questoes_gabarito = len(gabarito)

        # Se o aluno tem exatamente N questões e o gabarito também tem N,
        # e areas_config tem múltiplas áreas com ranges > N (fatiado),
        # então o Express mandou UMA área por vez — usar apenas a PRIMEIRA área válida
        areas_fatiadas = {k: v for k, v in areas_config.items() if v[0] > max_q_aluno}
        if len(areas_fatiadas) > 1 and n_questoes_aluno == n_questoes_gabarito:
            # Payload fatiado com múltiplas áreas mas mesmas questões
            # O Express envia uma área por vez — usar a primeira
            primeira_area = list(areas_config.keys())[0]
            print(f"[TRI V3 CIENTÍFICO] AVISO: payload fatiado com {len(areas_config)} áreas mas "
                  f"aluno tem apenas q1-q{max_q_aluno}. Processando apenas {primeira_area}.")
            areas_config = {primeira_area: areas_config[primeira_area]}

        t0 = time.time()
        print(f"\n[TRI V3 CIENTÍFICO] Processando {len(alunos)} alunos...")
        print(f"[TRI V3 CIENTÍFICO] Gabarito: {len(gabarito)} questões | Áreas: {list(areas_config.keys())}")
        print(f"[TRI V3 CIENTÍFICO] Questões no aluno: q1 a q{max_q_aluno} ({n_questoes_aluno} total)")

        # ─── Para cada área: converter letras→binário e rodar pipeline ───
        resultados_por_aluno: Dict[str, Dict] = {}
        diagnostico_geral: Dict[str, Any] = {}

        for area_code, (start, end) in areas_config.items():
            n_questoes = end - start + 1

            # Se aluno tem q1-q45 mas areas_config diz [91,135],
            # as respostas já vieram fatiadas → usar q1 a qN
            if start > max_q_aluno:
                # Respostas fatiadas: q1 a q(n_questoes_aluno), gabarito 1 a n_gabarito
                q_range = list(range(1, n_questoes_aluno + 1))
                gab_range = list(range(1, n_questoes_gabarito + 1))
                print(f"[TRI V3 CIENTÍFICO] {area_code}: fatiado, q1-q{n_questoes_aluno} vs gab 1-{n_questoes_gabarito}")
            else:
                # Respostas completas: qStart a qEnd
                q_range = list(range(start, end + 1))
                gab_range = list(range(start, end + 1))

            # Montar vetor binário: comparar resposta do aluno com gabarito
            alunos_binario = []
            for aluno in alunos:
                aluno_id = aluno.get('id', '')
                respostas_bin = []
                for q_num, g_num in zip(q_range, gab_range):
                    q_key = f'q{q_num}'
                    resposta_aluno = str(aluno.get(q_key, '')).strip().upper()
                    gabarito_q = str(gabarito.get(str(g_num), '')).strip().upper()
                    acertou = 1 if (resposta_aluno and resposta_aluno == gabarito_q) else 0
                    respostas_bin.append(acertou)

                alunos_binario.append({
                    'aluno_id': aluno_id,
                    'nome': aluno.get('nome', ''),
                    'respostas': respostas_bin,
                })

            # Mínimo de 10 alunos para calibração
            if len(alunos_binario) < 10:
                print(f"[TRI V3 CIENTÍFICO] AVISO: {area_code} com {len(alunos_binario)} alunos (<10), usando mediana")
                for ab in alunos_binario:
                    acertos = sum(ab['respostas'])
                    ref = tabela.obter(area_code, acertos)
                    aluno_id = ab['aluno_id']
                    if aluno_id not in resultados_por_aluno:
                        resultados_por_aluno[aluno_id] = {
                            'id': aluno_id,
                            'nome': ab['nome'],
                        }
                    from .motores.cientifico import estado_tri
                    resultados_por_aluno[aluno_id][f'tri_{area_code.lower()}'] = ref['tri_med']
                    resultados_por_aluno[aluno_id][f'{area_code.lower()}_acertos'] = acertos
                continue

            # Rodar pipeline científico para esta área
            resultado_area = pipeline_cientifico(
                alunos=alunos_binario,
                area=area_code,
                tabela=tabela,
            )

            diagnostico_geral[area_code] = resultado_area['diagnostico']

            # Mapear resultados para formato V2
            for r in resultado_area['resultados_alunos']:
                aluno_id = r['aluno_id']
                if aluno_id not in resultados_por_aluno:
                    resultados_por_aluno[aluno_id] = {
                        'id': aluno_id,
                        'nome': r.get('nome', ''),
                    }
                resultados_por_aluno[aluno_id][f'tri_{area_code.lower()}'] = r['nota_ancorada']
                resultados_por_aluno[aluno_id][f'{area_code.lower()}_acertos'] = r['acertos']
                resultados_por_aluno[aluno_id][f'{area_code.lower()}_theta'] = r['theta']
                resultados_por_aluno[aluno_id][f'{area_code.lower()}_estado'] = r['estado_tri']

        # ─── Montar resultado final no formato V2 ───
        resultados = []
        for aluno_id, dados in resultados_por_aluno.items():
            # TRI geral = média das áreas disponíveis
            tris = [v for k, v in dados.items() if k.startswith('tri_') and isinstance(v, (int, float))]
            tri_geral = round(float(np.mean(tris)), 1) if tris else 0.0

            # TCT (nota bruta 0-4)
            total_acertos = sum(v for k, v in dados.items() if k.endswith('_acertos') and isinstance(v, (int, float)))
            total_questoes = sum(end - start + 1 for start, end in areas_config.values())
            tct = round((total_acertos / total_questoes) * 4.0, 2) if total_questoes > 0 else 0.0

            dados['tri_geral'] = tri_geral
            dados['tct'] = tct
            resultados.append(dados)

        elapsed = time.time() - t0
        print(f"[TRI V3 CIENTÍFICO] Concluído em {elapsed:.2f}s | {len(resultados)} alunos × {len(areas_config)} áreas")

        # Prova analysis (resumo)
        tris_gerais = [r['tri_geral'] for r in resultados if r.get('tri_geral')]
        prova_analysis = {
            'total_alunos': len(resultados),
            'motor': 'cientifico_v3',
            'tri_medio': round(float(np.mean(tris_gerais)), 1) if tris_gerais else 0,
            'tri_min': round(float(np.min(tris_gerais)), 1) if tris_gerais else 0,
            'tri_max': round(float(np.max(tris_gerais)), 1) if tris_gerais else 0,
            'diagnostico_por_area': diagnostico_geral,
        }

        return JSONResponse(content=convert_numpy({
            "status": "sucesso",
            "total_alunos": len(resultados),
            "prova_analysis": prova_analysis,
            "resultados": resultados,
        }))

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[TRI V3 CIENTÍFICO] ERRO: {error_trace}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "erro",
                "mensagem": str(e),
                "trace": error_trace,
            }
        )


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINT — TABELA DE REFERÊNCIA (Útil para o frontend)
# ════════════════════════════════════════════════════════════════════════════════

@app.get("/api/v3/referencias/{area}")
async def obter_referencia(area: str):
    """Retorna a tabela de referência oficial para uma área."""
    if tabela is None:
        raise HTTPException(status_code=500, detail="Tabela não carregada")

    area = area.upper()
    if area not in tabela.lookup:
        raise HTTPException(
            status_code=404,
            detail=f"Área {area} não encontrada. Disponíveis: {tabela.areas}"
        )

    dados = []
    for acertos in sorted(tabela.lookup[area].keys()):
        ref = tabela.lookup[area][acertos]
        dados.append({
            'acertos': acertos,
            'tri_min': ref['tri_min'],
            'tri_med': ref['tri_med'],
            'tri_max': ref['tri_max'],
        })

    return {
        'area': area,
        'total_registros': len(dados),
        'dados': dados,
    }
