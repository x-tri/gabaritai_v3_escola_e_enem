"""
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║              TRI V2 - PRODUÇÃO CORRIGIDA COM TABELA OFICIAL                    ║
║                                                                                ║
║  • Usa: TRI_ENEM_DE_2009_A_2023_MIN_MED_E_MAX.xlsx (tabela oficial)           ║
║  • Agrega: Por ÁREA (CH, CN, LC, MT) + média dos anos                         ║
║  • Retorna: Valores corretos por área                                         ║
║  • Bug fixado: Zero acertos → TRI mínima correta (não inflada)                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import json
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Tuple, Optional

# ════════════════════════════════════════════════════════════════════════════════
# LIMITES MÁXIMOS OFICIAIS DO ENEM (TETO ABSOLUTO)
# ════════════════════════════════════════════════════════════════════════════════
# Estes valores representam as notas TRI máximas historicamente alcançáveis no ENEM.
# Mesmo com 45 acertos e coerência perfeita, a nota NÃO pode ultrapassar estes limites.
TRI_MAXIMA_OFICIAL = {
    'LC': 790.0,   # Linguagens e Códigos - máximo histórico
    'CH': 820.0,   # Ciências Humanas - máximo histórico
    'CN': 870.0,   # Ciências da Natureza - máximo histórico
    'MT': 980.0,   # Matemática - máximo histórico
}

# ════════════════════════════════════════════════════════════════════════════════
# 1. CARREGAMENTO DE TABELA DE REFERÊNCIA
# ════════════════════════════════════════════════════════════════════════════════

class TabelaReferenciaTRI:
    """
    Gerenciador de tabela de referência TRI oficial.
    
    Estrutura:
    - area: CH, CN, LC, MT
    - acertos: 0-45 (número de acertos por área)
    - tri_min, tri_med, tri_max: valores agregados (média dos anos 2009-2023)
    """
    
    def __init__(self, csv_path: str):
        """
        Carrega tabela de referência agregada.
        
        Args:
            csv_path: Caminho para 'tri_tabela_referencia_oficial.csv'
        """
        self.df = pd.read_csv(csv_path)
        
        # Validar estrutura
        required_cols = ['area', 'acertos', 'tri_min', 'tri_med', 'tri_max']
        assert all(col in self.df.columns for col in required_cols), \
            f"Tabela deve ter colunas: {required_cols}"
        
        # Criar dicionário para lookup rápido
        self.lookup = {}
        for area in self.df['area'].unique():
            self.lookup[area] = {}
            area_df = self.df[self.df['area'] == area]
            for _, row in area_df.iterrows():
                acertos = int(row['acertos'])
                self.lookup[area][acertos] = {
                    'tri_min': round(row['tri_min'], 1),
                    'tri_med': round(row['tri_med'], 1),
                    'tri_max': round(row['tri_max'], 1)
                }
    
    def obter(self, area: str, acertos: int) -> Dict[str, float]:
        """
        Obtém valores TRI para uma área e número de acertos.
        
        Args:
            area: 'CH', 'CN', 'LC' ou 'MT'
            acertos: Número de acertos (0-45)
        
        Returns:
            Dict com 'tri_min', 'tri_med', 'tri_max'
        """
        if area not in self.lookup:
            raise ValueError(f"Área inválida: {area}")
        
        if acertos not in self.lookup[area]:
            # Se acertos está fora do range, usar valor máximo disponível
            max_acertos = max(self.lookup[area].keys())
            if acertos > max_acertos:
                acertos = max_acertos
        
        return self.lookup[area][acertos]
    
    def validar(self) -> bool:
        """Valida integridade da tabela."""
        for area in self.lookup:
            # Verificar se tem 0 acertos
            assert 0 in self.lookup[area], f"Falta 0 acertos para {area}"
            # Verificar se valores crescem monotonicamente
            tri_meds = [self.lookup[area][a]['tri_med'] for a in sorted(self.lookup[area].keys())]
            assert tri_meds == sorted(tri_meds), f"TRI não está monotônica para {area}"
        return True


# ════════════════════════════════════════════════════════════════════════════════
# 2. ANÁLISE DE COERÊNCIA (mantém coerência pedagógica)
# ════════════════════════════════════════════════════════════════════════════════

@dataclass
class AnaliseCoerencia:
    """Resultado da análise de coerência do aluno."""
    coerencia: float  # 0.0 a 1.0
    padrao_resposta: str
    taxa_muito_facil: float
    taxa_facil: float
    taxa_media: float
    taxa_dificil: float
    taxa_muito_dificil: float


class AlunoCoherenceAnalyzer:
    """
    Analisa padrão de respostas do aluno para detectar coerência.
    """
    
    def __init__(self, respostas_por_dificuldade: Dict[str, int]):
        """
        Args:
            respostas_por_dificuldade: {
                'muito_facil': 5,
                'facil': 8,
                'media': 3,
                'dificil': 2,
                'muito_dificil': 1
            }
        """
        self.respostas = respostas_por_dificuldade
    
    def analisar(self) -> AnaliseCoerencia:
        """
        Analisa coerência das respostas.
        
        Coerência esperada:
        - Acerta mais em fácil → acerta menos em difícil
        - Padrão: MF > F > M > D > MD
        """
        total = sum(self.respostas.values())
        
        if total == 0:
            return AnaliseCoerencia(
                coerencia=0.0,
                padrao_resposta='Aluno não respondeu',
                taxa_muito_facil=0.0,
                taxa_facil=0.0,
                taxa_media=0.0,
                taxa_dificil=0.0,
                taxa_muito_dificil=0.0
            )
        
        # Calcular taxas
        taxa_mf = self.respostas.get('muito_facil', 0) / total
        taxa_f = self.respostas.get('facil', 0) / total
        taxa_m = self.respostas.get('media', 0) / total
        taxa_d = self.respostas.get('dificil', 0) / total
        taxa_md = self.respostas.get('muito_dificil', 0) / total
        
        # Verificar coerência (padrão esperado: MF ≥ F ≥ M ≥ D ≥ MD)
        comparacoes = [
            taxa_mf >= taxa_f,
            taxa_f >= taxa_m,
            taxa_m >= taxa_d,
            taxa_d >= taxa_md
        ]
        coerencia_base = sum(comparacoes) / len(comparacoes)
        
        # DIFERENCIADOR: Peso das questões acertadas por dificuldade
        # Quem acerta mais fáceis = coerência maior
        # Quem acerta mais difíceis = coerência menor (suspeito)
        peso_acertos = (
            self.respostas.get('muito_facil', 0) * 1.0 +
            self.respostas.get('facil', 0) * 0.8 +
            self.respostas.get('media', 0) * 0.5 +
            self.respostas.get('dificil', 0) * 0.3 +
            self.respostas.get('muito_dificil', 0) * 0.1
        )
        peso_max = total * 1.0 if total > 0 else 1
        peso_normalizado = peso_acertos / peso_max if peso_max > 0 else 0.5
        
        # DIFERENCIADOR: Peso baseado na dificuldade REAL das questões acertadas
        # (calculado pela % de acerto da TURMA)
        # Valor alto = acertou questões difíceis (poucos acertaram)
        peso_dificuldade = self.respostas.get('_peso_dificuldade', 0.5)
        
        # Coerência final: combina padrão + peso por classificação + peso dificuldade real
        # Quem acerta questões DIFÍCEIS (peso_dificuldade alto) = coerência MAIOR
        coerencia = coerencia_base * 0.3 + peso_normalizado * 0.3 + peso_dificuldade * 0.4
        
        # Classificar padrão
        if coerencia >= 0.85:
            padrao = 'Padrão coerente (acertou mais fáceis)'
        elif coerencia >= 0.65:
            padrao = 'Padrão consistente'
        elif coerencia >= 0.45:
            padrao = 'Padrão parcialmente coerente'
        else:
            padrao = 'Padrão incoerente (acertou mais difíceis)'
        
        return AnaliseCoerencia(
            coerencia=coerencia,
            padrao_resposta=padrao,
            taxa_muito_facil=taxa_mf,
            taxa_facil=taxa_f,
            taxa_media=taxa_m,
            taxa_dificil=taxa_d,
            taxa_muito_dificil=taxa_md
        )


# ════════════════════════════════════════════════════════════════════════════════
# 3. CÁLCULO DE TRI
# ════════════════════════════════════════════════════════════════════════════════

@dataclass
class ResultadoTRI:
    """Resultado do cálculo TRI para uma área."""
    area: str
    acertos: int
    tri_baseline: float
    ajuste_coerencia: float
    ajuste_relacao: float
    penalidade: float
    tri_ajustado: float
    motivo: str


class TRICalculator:
    """
    Calcula TRI para uma área com base em acertos e padrão de resposta.
    """
    
    def __init__(self, tabela_referencia: TabelaReferenciaTRI):
        self.tabela = tabela_referencia
    
    def calcular(
        self,
        area: str,
        acertos: int,
        analise_coerencia: Optional[AnaliseCoerencia] = None,
        relacao_com_outras_areas: Optional[Dict[str, float]] = None
    ) -> ResultadoTRI:
        """
        Calcula TRI para uma área.
        
        Args:
            area: 'CH', 'CN', 'LC', 'MT'
            acertos: Número de acertos (0-45)
            analise_coerencia: Análise de coerência das respostas
            relacao_com_outras_areas: TRI de outras áreas para ajuste relativo
        
        Returns:
            ResultadoTRI com detalhes do cálculo
        """
        
        # [CRÍTICO] Se zero acertos, retornar TRI MÉDIA OFICIAL SEM ajustes
        # Valores obrigatórios: CH=329.8, CN=339.9, LC=299.6, MT=342.8
        if acertos == 0:
            baseline = self.tabela.obter(area, 0)
            tri_med = baseline['tri_med']  # Usar tri_med (não tri_min) para valores oficiais
            
            return ResultadoTRI(
                area=area,
                acertos=acertos,
                tri_baseline=tri_med,
                ajuste_coerencia=0.0,
                ajuste_relacao=0.0,
                penalidade=0.0,
                tri_ajustado=tri_med,
                motivo=f'Zero acertos: TRI oficial ({tri_med:.1f}) sem ajustes'
            )
        
        # Buscar valores baseline
        baseline = self.tabela.obter(area, acertos)
        tri_med = baseline['tri_med']
        tri_min = baseline['tri_min']
        tri_max = baseline['tri_max']
        
        # Inicializar ajustes
        ajuste_coerencia = 0.0
        ajuste_relacao = 0.0
        penalidade = 0.0
        motivo = f'{area}: {acertos} acertos'
        
        # Range disponível para ajustes (distância entre min e max da tabela)
        range_disponivel = tri_max - tri_min
        
        # [AJUSTE 1] Coerência Pedagógica - IMPACTO SIGNIFICATIVO
        # A coerência mede se o aluno acertou proporcionalmente mais questões fáceis que difíceis
        # Coerência 1.0 = padrão perfeito (acerta 100% fácil, 0% difícil)
        # Coerência 0.5 = aleatório
        # Coerência 0.0 = padrão inverso (acerta difícil, erra fácil) - suspeito!
        if analise_coerencia:
            coer = analise_coerencia.coerencia
            
            # Usar o range da tabela (tri_min a tri_max) para ajustes
            # Coerência 0.5 = ponto neutro (tri_med)
            # Coerência 1.0 = máximo bônus (aproxima de tri_max)
            # Coerência 0.0 = máxima penalidade (aproxima de tri_min)
            
            if coer >= 0.5:
                # Padrão coerente → bônus proporcional
                # coer=0.5 → 0%, coer=1.0 → 50% do range_disponivel acima de tri_med
                fator_bonus = (coer - 0.5) * 2  # 0 a 1
                ajuste_coerencia = fator_bonus * (range_disponivel * 0.5)
                if ajuste_coerencia > 0.5:  # Só logar se relevante
                    motivo += f' | Coerência {coer:.2f}: +{ajuste_coerencia:.1f}'
            else:
                # Padrão incoerente → penalidade proporcional
                # coer=0.5 → 0%, coer=0.0 → 50% do range_disponivel abaixo de tri_med
                fator_penalidade = (0.5 - coer) * 2  # 0 a 1
                penalidade = fator_penalidade * (range_disponivel * 0.5)
                if penalidade > 0.5:  # Só logar se relevante
                    motivo += f' | Incoerência {coer:.2f}: -{penalidade:.1f}'
            
            # BÔNUS: Acertar questões DIFÍCEIS é excepcional!
            # Na TRI, quem acerta questões que POUCOS acertam deve ter nota MAIOR
            if analise_coerencia.taxa_muito_dificil > 0.3:
                # Acertou muitas questões muito difíceis - BÔNUS!
                bonus_dificil = analise_coerencia.taxa_muito_dificil * 20.0
                ajuste_coerencia += bonus_dificil
                motivo += f' | Bônus difíceis: +{bonus_dificil:.1f}'
            elif analise_coerencia.taxa_dificil > 0.3:
                # Acertou muitas questões difíceis - bônus menor
                bonus_dificil = analise_coerencia.taxa_dificil * 10.0
                ajuste_coerencia += bonus_dificil
                motivo += f' | Bônus difíceis: +{bonus_dificil:.1f}'
        
        # [AJUSTE 2] Relação com outras áreas (contexto - menor impacto)
        if relacao_com_outras_areas and len(relacao_com_outras_areas) > 0:
            media_outras = np.mean(list(relacao_com_outras_areas.values()))
            diferenca = tri_med - media_outras
            
            if diferenca > 50:
                # Muito acima da média das outras áreas → conservador
                ajuste_relacao = -5.0
            elif diferenca < -50:
                # Muito abaixo da média das outras áreas → boost
                ajuste_relacao = 5.0
        
        # Aplicar ajustes
        tri_ajustado = tri_med + ajuste_coerencia + ajuste_relacao - penalidade

        # Garantir que fica dentro do range [tri_min, tri_max] da tabela oficial
        tri_ajustado = max(tri_min, min(tri_max, tri_ajustado))

        # [CRÍTICO] Aplicar limite máximo oficial do ENEM (teto absoluto)
        # Mesmo que a tabela tenha valores acima, a nota NUNCA pode ultrapassar o máximo histórico
        tri_maxima_oficial = TRI_MAXIMA_OFICIAL.get(area, 1000.0)
        if tri_ajustado > tri_maxima_oficial:
            motivo += f' | LIMITADO ao máximo oficial {area}: {tri_maxima_oficial}'
            tri_ajustado = tri_maxima_oficial

        return ResultadoTRI(
            area=area,
            acertos=acertos,
            tri_baseline=tri_med,
            ajuste_coerencia=ajuste_coerencia,
            ajuste_relacao=ajuste_relacao,
            penalidade=penalidade,
            tri_ajustado=tri_ajustado,
            motivo=motivo
        )


# ════════════════════════════════════════════════════════════════════════════════
# 4. ORQUESTRADOR PRINCIPAL
# ════════════════════════════════════════════════════════════════════════════════

class TRIProcessadorV2:
    """
    Processador completo de TRI V2 para um aluno.
    """
    
    def __init__(self, tabela_referencia: TabelaReferenciaTRI):
        self.tabela = tabela_referencia
        self.calculator = TRICalculator(tabela_referencia)
    
    def processar_aluno(
        self,
        lc_acertos: int,
        ch_acertos: int,
        cn_acertos: int,
        mt_acertos: int,
        respostas_por_dificuldade: Dict[str, Dict[str, int]] = None
    ) -> Dict:
        """
        Processa TRI completo para um aluno.
        
        Args:
            lc_acertos, ch_acertos, cn_acertos, mt_acertos: Acertos por área
            respostas_por_dificuldade: {
                'LC': {'muito_facil': 5, 'facil': 8, ...},
                'CH': {...},
                ...
            }
        
        Returns:
            Dicionário com resultados por área e geral
        """
        
        areas = {
            'LC': lc_acertos,
            'CH': ch_acertos,
            'CN': cn_acertos,
            'MT': mt_acertos
        }
        
        # Calcular TRI para cada área
        resultados = {}
        tris = {}
        
        for area, acertos in areas.items():
            # Analisar coerência se disponível
            analise_coerencia = None
            if respostas_por_dificuldade and area in respostas_por_dificuldade:
                analyzer = AlunoCoherenceAnalyzer(respostas_por_dificuldade[area])
                analise_coerencia = analyzer.analisar()
            
            # Relação com outras áreas (contexto)
            outras_areas = {k: v for k, v in areas.items() if k != area}
            relacao = {k: self.tabela.obter(k, v)['tri_med'] for k, v in outras_areas.items()}
            
            # Calcular
            resultado = self.calculator.calcular(
                area=area,
                acertos=acertos,
                analise_coerencia=analise_coerencia,
                relacao_com_outras_areas=relacao
            )
            
            resultados[area] = resultado
            # Aplicar limite máximo oficial como garantia extra
            tri_valor = min(resultado.tri_ajustado, TRI_MAXIMA_OFICIAL.get(area, 1000.0))
            tris[area] = tri_valor

        # Calcular TRI geral (média das áreas)
        tri_geral = np.mean(list(tris.values()))
        
        # Calcular TCT (nota bruta 0-4)
        total_acertos = lc_acertos + ch_acertos + cn_acertos + mt_acertos
        tct = (total_acertos / 90.0) * 4.0  # Escala 0-4
        
        return {
            'tct': round(tct, 2),
            'tri_geral': round(tri_geral, 1),
            'tri_lc': round(tris['LC'], 1),
            'tri_ch': round(tris['CH'], 1),
            'tri_cn': round(tris['CN'], 1),
            'tri_mt': round(tris['MT'], 1),
            'detalhes': {area: {
                'acertos': resultado.acertos,
                'baseline': resultado.tri_baseline,
                'ajustes': {
                    'coerencia': resultado.ajuste_coerencia,
                    'relacao': resultado.ajuste_relacao,
                    'penalidade': resultado.penalidade
                },
                'tri_ajustado': resultado.tri_ajustado,
                'motivo': resultado.motivo
            } for area, resultado in resultados.items()}
        }
    
    def processar_turma(
        self,
        alunos: list,
        gabarito: dict,
        areas_config: dict
    ) -> tuple:
        """
        Processa uma turma completa de alunos COM COERÊNCIA PEDAGÓGICA.
        
        A coerência é calculada assim:
        1. Primeiro, calcula % de acerto de CADA QUESTÃO usando TODOS os alunos
        2. Classifica questões em: muito_facil (>80%), facil (60-80%), media (40-60%), dificil (20-40%), muito_dificil (<20%)
        3. Para cada aluno, verifica se ele acertou mais as fáceis e menos as difíceis (padrão esperado)
        4. Alunos que acertam questões difíceis mas erram fáceis são penalizados (possível chute/cola)
        5. Alunos com padrão coerente (acerta fácil > difícil) recebem bônus
        
        Args:
            alunos: Lista de dicionários com dados dos alunos
            gabarito: Dicionário com gabarito oficial
            areas_config: Configuração de áreas {'LC': [1, 45], 'CH': [46, 90], ...}
        
        Returns:
            Tuple (prova_analysis, resultados)
        """
        resultados = []
        
        # Mapear nomes de áreas para códigos padrão (LC, CH, CN, MT)
        area_mapping = {
            'LC': 'LC',
            'Linguagens e Códigos': 'LC',
            'Linguagens': 'LC',
            'CH': 'CH',
            'Ciências Humanas': 'CH',
            'CN': 'CN',
            'Ciências da Natureza': 'CN',
            'MT': 'MT',
            'Matemática': 'MT'
        }
        
        print("=" * 80)
        print("🔍 [TRI V2] Recebido areas_config:", areas_config)
        print("🔍 [TRI V2] Total alunos:", len(alunos))
        print("🔍 [TRI V2] Total questões no gabarito:", len(gabarito))
        
        normalized_areas = {}
        for area_name, range_config in areas_config.items():
            area_code = area_mapping.get(area_name, area_name)
            if area_code in ['LC', 'CH', 'CN', 'MT']:
                normalized_areas[area_code] = range_config
                print(f"🔍 [TRI V2] Área mapeada: {area_name} -> {area_code} = {range_config}")
        
        if not normalized_areas:
            raise ValueError(
                f"areas_config inválido ou vazio. Recebido: {areas_config}. "
                "O frontend deve sempre enviar areas_config baseado no template selecionado."
            )
        
        # ═══════════════════════════════════════════════════════════════════════════
        # PASSO 1: CALCULAR DIFICULDADE DE CADA QUESTÃO (% de acerto da turma)
        # ═══════════════════════════════════════════════════════════════════════════
        print("\n📊 [TRI V2] PASSO 1: Calculando dificuldade das questões...")
        
        # Estrutura: {questao_num: {'acertos': N, 'total': N, 'pct': 0.XX}}
        questoes_stats = {}
        
        for q_num_str in gabarito.keys():
            q_num = int(q_num_str)
            acertos = 0
            total = len(alunos)  # TODOS os alunos contam no total (não só os que responderam)
            
            for aluno in alunos:
                q_key = f'q{q_num}'
                resposta = aluno.get(q_key, '')
                # Acertou se: (1) respondeu, (2) resposta != X, (3) resposta == gabarito
                if resposta and resposta != 'X' and resposta == gabarito[q_num_str]:
                    acertos += 1
            
            # % de acerto considera TODOS os alunos (incluindo quem não respondeu = errou)
            pct = acertos / total if total > 0 else 0.0
            questoes_stats[q_num] = {
                'acertos': acertos,
                'total': total,
                'pct': pct
            }
        
        # Classificar questões por dificuldade
        def classificar_dificuldade(pct):
            if pct >= 0.80:
                return 'muito_facil'
            elif pct >= 0.60:
                return 'facil'
            elif pct >= 0.40:
                return 'media'
            elif pct >= 0.20:
                return 'dificil'
            else:
                return 'muito_dificil'
        
        # Atribuir classificação
        for q_num, stats in questoes_stats.items():
            stats['dificuldade'] = classificar_dificuldade(stats['pct'])
        
        # Log: distribuição de dificuldade
        dif_counts = {'muito_facil': 0, 'facil': 0, 'media': 0, 'dificil': 0, 'muito_dificil': 0}
        for stats in questoes_stats.values():
            dif_counts[stats['dificuldade']] += 1
        print(f"📊 [TRI V2] Distribuição de dificuldade: {dif_counts}")
        
        # ═══════════════════════════════════════════════════════════════════════════
        # PASSO 2: PROCESSAR CADA ALUNO COM COERÊNCIA
        # ═══════════════════════════════════════════════════════════════════════════
        print("\n📊 [TRI V2] PASSO 2: Processando alunos com coerência pedagógica...")
        
        for aluno_idx, aluno in enumerate(alunos):
            nome = aluno.get('nome', f'Aluno_{aluno_idx}')
            
            # Contar acertos por área E por dificuldade
            acertos_por_area = {'LC': 0, 'CH': 0, 'CN': 0, 'MT': 0}
            
            # Estrutura para coerência: {area: {dificuldade: {'acertos': N, 'total': N}}}
            coerencia_por_area = {
                area: {
                    'muito_facil': {'acertos': 0, 'total': 0},
                    'facil': {'acertos': 0, 'total': 0},
                    'media': {'acertos': 0, 'total': 0},
                    'dificil': {'acertos': 0, 'total': 0},
                    'muito_dificil': {'acertos': 0, 'total': 0}
                }
                for area in normalized_areas.keys()
            }
            
            # Processar cada área + criar hash das questões acertadas
            questoes_acertadas_por_area = {area: [] for area in normalized_areas.keys()}
            
            for area_code, (start, end) in normalized_areas.items():
                for i in range(start, end + 1):
                    q_key = f'q{i}'
                    if i in questoes_stats and q_key in aluno:
                        dif = questoes_stats[i]['dificuldade']
                        coerencia_por_area[area_code][dif]['total'] += 1
                        
                        if aluno.get(q_key) == gabarito.get(str(i)):
                            acertos_por_area[area_code] += 1
                            coerencia_por_area[area_code][dif]['acertos'] += 1
                            questoes_acertadas_por_area[area_code].append(i)
            
            # Converter coerência para formato esperado pelo processar_aluno
            respostas_por_dificuldade = {}
            for area_code in normalized_areas.keys():
                respostas_por_dificuldade[area_code] = {}
                for dif in ['muito_facil', 'facil', 'media', 'dificil', 'muito_dificil']:
                    # Usar número de acertos por dificuldade
                    respostas_por_dificuldade[area_code][dif] = coerencia_por_area[area_code][dif]['acertos']
                
                # DIFERENCIADOR: Peso baseado na DIFICULDADE REAL das questões acertadas
                # Dificuldade = % de acerto da TURMA (não posição)
                # Quem acerta questões DIFÍCEIS (baixa % acerto) = peso MAIOR (excepcional)
                # Quem acerta questões FÁCEIS (alta % acerto) = peso menor (esperado)
                questoes = questoes_acertadas_por_area.get(area_code, [])
                if questoes:
                    # Calcular dificuldade média das questões acertadas
                    # pct baixo = difícil, pct alto = fácil
                    dificuldade_media = 0.0
                    for q in questoes:
                        if q in questoes_stats:
                            pct_acerto = questoes_stats[q]['pct']
                            # Inverter: questão com % baixo = valor alto (difícil)
                            dificuldade_media += (1.0 - pct_acerto)
                    dificuldade_media /= len(questoes)
                    
                    # Peso: quem acerta mais difíceis = coerência MAIOR
                    respostas_por_dificuldade[area_code]['_peso_dificuldade'] = dificuldade_media
                else:
                    respostas_por_dificuldade[area_code]['_peso_dificuldade'] = 0.5
            
            # Processar aluno COM coerência
            resultado_aluno = self.processar_aluno(
                lc_acertos=acertos_por_area.get('LC', 0),
                ch_acertos=acertos_por_area.get('CH', 0),
                cn_acertos=acertos_por_area.get('CN', 0),
                mt_acertos=acertos_por_area.get('MT', 0),
                respostas_por_dificuldade=respostas_por_dificuldade
            )
            
            # Adicionar metadados
            resultado_aluno['nome'] = nome
            resultado_aluno['lc_acertos'] = acertos_por_area.get('LC', 0)
            resultado_aluno['ch_acertos'] = acertos_por_area.get('CH', 0)
            resultado_aluno['cn_acertos'] = acertos_por_area.get('CN', 0)
            resultado_aluno['mt_acertos'] = acertos_por_area.get('MT', 0)
            
            # Log detalhado para primeiros alunos
            if aluno_idx < 3:
                print(f"\n👤 [TRI V2] Aluno {aluno_idx + 1}: {nome}")
                for area_code in normalized_areas.keys():
                    acertos = acertos_por_area.get(area_code, 0)
                    tri_key = f'tri_{area_code.lower()}'
                    tri_val = resultado_aluno.get(tri_key, 'N/A')
                    
                    # Mostrar distribuição de acertos por dificuldade
                    dist = []
                    for dif in ['muito_facil', 'facil', 'media', 'dificil', 'muito_dificil']:
                        ac = coerencia_por_area[area_code][dif]['acertos']
                        tot = coerencia_por_area[area_code][dif]['total']
                        if tot > 0:
                            dist.append(f"{dif[:2]}:{ac}/{tot}")
                    
                    ajustes = resultado_aluno['detalhes'].get(area_code, {}).get('ajustes', {})
                    coer = ajustes.get('coerencia', 0)
                    pen = ajustes.get('penalidade', 0)
                    
                    print(f"   {area_code}: {acertos} acertos -> TRI {tri_val} (coer:{coer:+.1f}, pen:{pen:.1f})")
                    print(f"      Distribuição: {', '.join(dist)}")
            
            resultados.append(resultado_aluno)
        
        print(f"\n✅ [TRI V2] Total processados: {len(resultados)} alunos")
        print("=" * 80)
        
        # Análise da prova (estatísticas gerais)
        if resultados:
            prova_analysis = {
                'total_alunos': len(resultados),
                'tri_medio': np.mean([r['tri_geral'] for r in resultados]),
                'tri_min': np.min([r['tri_geral'] for r in resultados]),
                'tri_max': np.max([r['tri_geral'] for r in resultados]),
                'tct_medio': np.mean([r['tct'] for r in resultados]),
                'questoes_stats': {
                    'muito_facil': dif_counts['muito_facil'],
                    'facil': dif_counts['facil'],
                    'media': dif_counts['media'],
                    'dificil': dif_counts['dificil'],
                    'muito_dificil': dif_counts['muito_dificil']
                }
            }
        else:
            prova_analysis = {
                'total_alunos': 0,
                'tri_medio': 0,
                'tri_min': 0,
                'tri_max': 0,
                'tct_medio': 0
            }
        
        return prova_analysis, resultados


# ════════════════════════════════════════════════════════════════════════════════
# 5. TESTE E VALIDAÇÃO
# ════════════════════════════════════════════════════════════════════════════════

def teste_completo():
    """Testa o sistema com exemplos."""
    
    print("\n" + "="*120)
    print("🧪 TESTE: TRI V2 COM TABELA OFICIAL")
    print("="*120)
    
    # Carregar tabela
    tabela = TabelaReferenciaTRI('/mnt/user-data/outputs/tri_tabela_referencia_oficial.csv')
    assert tabela.validar(), "Tabela inválida!"
    print("✓ Tabela de referência carregada e validada")
    
    # Criar processador
    processador = TRIProcessadorV2(tabela)
    
    # TESTE 1: Aluno com 0 acertos
    print("\n" + "-"*120)
    print("TESTE 1: Aluno com 0 acertos (deve retornar TRI mínima)")
    print("-"*120)
    
    resultado = processador.processar_aluno(
        lc_acertos=0,
        ch_acertos=0,
        cn_acertos=0,
        mt_acertos=0
    )
    
    print(f"TCT: {resultado['tct']}")
    print(f"TRI Geral: {resultado['tri_geral']}")
    print(f"TRI LC (esperado ~300): {resultado['tri_lc']}")
    print(f"TRI CH (esperado ~330): {resultado['tri_ch']}")
    print(f"TRI CN (esperado ~340): {resultado['tri_cn']}")
    print(f"TRI MT (esperado ~343): {resultado['tri_mt']}")
    
    assert resultado['tri_lc'] < 310, "LC deveria estar por volta de 300!"
    assert resultado['tri_ch'] < 340, "CH deveria estar por volta de 330!"
    print("✅ Teste 1 passou!")
    
    # TESTE 2: Aluno com distribuição normal
    print("\n" + "-"*120)
    print("TESTE 2: Aluno com 10 acertos por área (40 total)")
    print("-"*120)
    
    resultado = processador.processar_aluno(
        lc_acertos=10,
        ch_acertos=10,
        cn_acertos=10,
        mt_acertos=10
    )
    
    print(f"TCT: {resultado['tct']}")
    print(f"TRI Geral: {resultado['tri_geral']}")
    print(f"TRI LC: {resultado['tri_lc']}")
    print(f"TRI CH: {resultado['tri_ch']}")
    print(f"TRI CN: {resultado['tri_cn']}")
    print(f"TRI MT: {resultado['tri_mt']}")
    
    # TCT deve ser ~1.8 (40/90 * 4)
    assert 1.7 < resultado['tct'] < 1.9, f"TCT esperada ~1.8, obtida {resultado['tct']}"
    # TRI deve estar correlacionado com TCT
    assert 400 < resultado['tri_geral'] < 480, f"TRI esperada ~400-480, obtida {resultado['tri_geral']}"
    print("✅ Teste 2 passou!")
    
    # TESTE 3: Aluno com distribuição desequilibrada
    print("\n" + "-"*120)
    print("TESTE 3: Aluno com desempenho desequilibrado (LC=20, MT=5)")
    print("-"*120)
    
    resultado = processador.processar_aluno(
        lc_acertos=20,
        ch_acertos=10,
        cn_acertos=10,
        mt_acertos=5
    )
    
    print(f"TCT: {resultado['tct']}")
    print(f"TRI Geral: {resultado['tri_geral']}")
    print(f"TRI LC (20 acertos): {resultado['tri_lc']}")
    print(f"TRI CH (10 acertos): {resultado['tri_ch']}")
    print(f"TRI CN (10 acertos): {resultado['tri_cn']}")
    print(f"TRI MT (5 acertos): {resultado['tri_mt']}")
    
    # LC deve ser bem maior que MT
    assert resultado['tri_lc'] > resultado['tri_mt'] + 50, \
        f"LC ({resultado['tri_lc']}) deveria ser significativamente maior que MT ({resultado['tri_mt']})"
    print("✅ Teste 3 passou!")
    
    print("\n" + "="*120)
    print("✅ TODOS OS TESTES PASSARAM!")
    print("="*120)


# Alias para compatibilidade com app.py
ProcessadorTRICompleto = TRIProcessadorV2

if __name__ == '__main__':
    teste_completo()
