"""
Gerenciador da tabela de referência TRI oficial do ENEM.

Carrega os dados de referência (tri_min, tri_med, tri_max) por área e número
de acertos, usados para ancoragem das notas em ambos os motores.
"""

import json
import os
from typing import Dict, Optional

# Limites máximos oficiais do ENEM (teto absoluto histórico)
TRI_MAXIMA_OFICIAL = {
    'LC': 796.0,   # Linguagens e Códigos - ENEM 2024
    'CH': 820.0,   # Ciências Humanas - ENEM 2024
    'CN': 867.0,   # Ciências da Natureza - ENEM 2024
    'MT': 962.0,   # Matemática - ENEM 2024
}

# Limites mínimos oficiais do ENEM
TRI_MINIMA_OFICIAL = {
    'LC': 294.0,
    'CH': 284.0,
    'CN': 308.0,
    'MT': 334.0,
}


class TabelaReferenciaTRI:
    """
    Gerenciador de tabela de referência TRI oficial.

    Estrutura interna (lookup):
    {
        'CH': {
            0: {'tri_min': 329.8, 'tri_med': 329.8, 'tri_max': 329.8},
            1: {'tri_min': 326.2, 'tri_med': 338.3, 'tri_max': 363.3},
            ...
            45: {'tri_min': ..., 'tri_med': ..., 'tri_max': ...}
        },
        'CN': {...},
        'LC': {...},
        'MT': {...}
    }
    """

    def __init__(self, json_path: Optional[str] = None):
        """
        Carrega tabela de referência a partir do JSON oficial.

        Args:
            json_path: Caminho para 'tri_tabela_referencia_oficial.json'.
                       Se None, usa o caminho padrão dentro de app/referencias/.
        """
        if json_path is None:
            json_path = os.path.join(
                os.path.dirname(__file__),
                'referencias',
                'tri_tabela_referencia_oficial.json'
            )

        with open(json_path, 'r') as f:
            raw = json.load(f)

        # Construir lookup com chaves inteiras
        self.lookup: Dict[str, Dict[int, Dict[str, float]]] = {}
        for area, acertos_dict in raw.items():
            self.lookup[area] = {}
            for acertos_str, valores in acertos_dict.items():
                acertos = int(acertos_str)
                self.lookup[area][acertos] = {
                    'tri_min': round(valores['tri_min'], 1),
                    'tri_med': round(valores['tri_med'], 1),
                    'tri_max': round(valores['tri_max'], 1),
                }

        # Áreas disponíveis
        self.areas = list(self.lookup.keys())

    def obter(self, area: str, acertos: int) -> Dict[str, float]:
        """
        Obtém valores TRI para uma área e número de acertos.

        Args:
            area: 'CH', 'CN', 'LC' ou 'MT'
            acertos: Número de acertos (0-45)

        Returns:
            Dict com 'tri_min', 'tri_med', 'tri_max'

        Raises:
            ValueError: Se a área não existe na tabela
        """
        if area not in self.lookup:
            raise ValueError(f"Área inválida: {area}. Disponíveis: {self.areas}")

        if acertos not in self.lookup[area]:
            # Se acertos está fora do range, usar valor máximo disponível
            max_acertos = max(self.lookup[area].keys())
            if acertos > max_acertos:
                acertos = max_acertos
            elif acertos < 0:
                acertos = 0

        return self.lookup[area][acertos]

    def validar(self) -> bool:
        """Valida integridade da tabela (monotonia da mediana)."""
        for area in self.lookup:
            assert 0 in self.lookup[area], f"Falta 0 acertos para {area}"
            tri_meds = [
                self.lookup[area][a]['tri_med']
                for a in sorted(self.lookup[area].keys())
            ]
            assert tri_meds == sorted(tri_meds), \
                f"TRI mediana não está monotônica para {area}"
        return True

    def info(self) -> Dict:
        """Retorna informações sobre a tabela carregada."""
        return {
            'areas': self.areas,
            'acertos_por_area': {
                area: len(vals) for area, vals in self.lookup.items()
            },
            'limites_oficiais': {
                area: {
                    'min': TRI_MINIMA_OFICIAL.get(area),
                    'max': TRI_MAXIMA_OFICIAL.get(area),
                }
                for area in self.areas
            }
        }
