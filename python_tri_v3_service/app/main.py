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
