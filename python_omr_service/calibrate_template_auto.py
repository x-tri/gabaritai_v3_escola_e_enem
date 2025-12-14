#!/usr/bin/env python3
"""
Script de Calibração Automática do Template OMR
Detecta automaticamente TODAS as bolinhas no gabarito em branco
"""

import cv2
import numpy as np
from pathlib import Path
import json

# Caminho para o template em branco
TEMPLATE_PATH = Path(__file__).parent.parent / "data" / "Modelo de cartão - menor.pdf"
OUTPUT_PATH = Path(__file__).parent / "template_calibration.json"

def pdf_to_image(pdf_path):
    """Converte PDF para imagem usando pdf2image"""
    from pdf2image import convert_from_path
    images = convert_from_path(str(pdf_path), dpi=300)
    # Converter PIL para OpenCV
    return cv2.cvtColor(np.array(images[0]), cv2.COLOR_RGB2BGR)

def detect_circles(image, min_radius=18, max_radius=28, roi_y_start=2300, roi_y_end=3400):
    """
    Detecta círculos no gabarito APENAS na região de interesse (ROI)
    """
    # Recortar apenas a região do gabarito
    height = image.shape[0]
    roi_y_start = max(0, roi_y_start)
    roi_y_end = min(height, roi_y_end)
    
    roi_image = image[roi_y_start:roi_y_end, :]
    
    gray = cv2.cvtColor(roi_image, cv2.COLOR_BGR2GRAY)
    
    # Aplicar blur para reduzir ruído
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.5)
    
    # Detectar círculos usando HoughCircles
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=35,  # Distância mínima entre círculos
        param1=50,
        param2=25,
        minRadius=min_radius,
        maxRadius=max_radius
    )
    
    if circles is not None:
        circles = np.round(circles[0, :]).astype("int")
        # Ajustar coordenadas Y para a imagem completa
        for circle in circles:
            circle[1] += roi_y_start
        return circles
    return []

def group_circles_by_row_and_column(circles, y_tolerance=20, x_tolerance=50):
    """
    Agrupa círculos em linhas (Y similar) e colunas (X similar)
    """
    if len(circles) == 0:
        return []
    
    # Ordenar por Y primeiro, depois por X
    sorted_circles = sorted(circles, key=lambda c: (c[1], c[0]))
    
    # Agrupar por linhas (Y similar)
    rows = []
    current_row = [sorted_circles[0]]
    
    for circle in sorted_circles[1:]:
        if abs(circle[1] - current_row[0][1]) <= y_tolerance:
            current_row.append(circle)
        else:
            rows.append(sorted(current_row, key=lambda c: c[0]))  # Ordenar por X
            current_row = [circle]
    rows.append(sorted(current_row, key=lambda c: c[0]))
    
    return rows

def analyze_structure(rows):
    """
    Analisa a estrutura do gabarito (quantas linhas, colunas, bolinas por questão)
    """
    print(f"\n📊 ESTRUTURA DETECTADA:")
    print(f"  Total de linhas: {len(rows)}")
    
    for i, row in enumerate(rows[:3]):  # Mostrar apenas primeiras 3 linhas
        print(f"  Linha {i+1}: {len(row)} círculos")
        if len(row) > 0:
            x_coords = [c[0] for c in row]
            print(f"    X range: {min(x_coords)} - {max(x_coords)}")
    
    # Tentar detectar padrão de colunas (blocos de questões)
    if len(rows) > 0:
        first_row_x = [c[0] for c in rows[0]]
        # Agrupar Xs por proximidade (identificar blocos)
        blocks = []
        current_block = [first_row_x[0]]
        
        for x in first_row_x[1:]:
            if abs(x - current_block[-1]) < 100:  # Mesma questão (5 opções)
                current_block.append(x)
            else:
                blocks.append(current_block)
                current_block = [x]
        blocks.append(current_block)
        
        print(f"\n  Blocos detectados (colunas de questões): {len(blocks)}")
        print(f"  Opções por questão: {len(blocks[0]) if blocks else 0}")
    
    return rows

def build_template_config(rows):
    """
    Constrói configuração do template baseada nos círculos detectados
    """
    # Assumir estrutura: 6 blocos (colunas) x 15 linhas x 5 opções
    # Cada linha tem 30 círculos (6 questões x 5 opções)
    
    if len(rows) < 15:
        raise ValueError(f"Esperado pelo menos 15 linhas, mas encontrado apenas {len(rows)}")
    
    # Pegar as primeiras 15 linhas (área de gabarito)
    gabarito_rows = rows[:15]
    
    # Extrair Y coordinates (média de cada linha) - converter para int Python
    y_coords = []
    for row in gabarito_rows:
        avg_y = int(np.mean([c[1] for c in row]))
        y_coords.append(int(avg_y))  # Garantir int Python
    
    # Extrair X coordinates por bloco
    # Primeira linha tem todos os Xs
    first_row_x = sorted([int(c[0]) for c in gabarito_rows[0]])  # Garantir int Python
    
    # Agrupar em 6 blocos (cada bloco = 5 opções)
    blocos_x = []
    for i in range(0, len(first_row_x), 5):
        bloco = [int(x) for x in first_row_x[i:i+5]]  # Garantir int Python
        if len(bloco) == 5:
            blocos_x.append(bloco)
            print(f"  Bloco {len(blocos_x)}: X = {bloco}")
    
    # Calcular bubble_radius (média dos raios detectados)
    all_radii = []
    for row in gabarito_rows:
        for circle in row:
            all_radii.append(circle[2])
    avg_radius = int(np.mean(all_radii))
    
    print(f"\n✅ CALIBRAÇÃO COMPLETA:")
    print(f"  Y coords (15 linhas): {y_coords}")
    print(f"  Blocos X (6 colunas): {len(blocos_x)}")
    print(f"  Raio médio: {avg_radius}px")
    
    return {
        "y_coords": y_coords,
        "blocos_x": blocos_x,
        "bubble_radius": avg_radius,
        "bubble_radius_tolerance": 0.20,
        "total_questions": 90,
        "columns": 6,
        "rows_per_column": 15,
        "options_per_question": 5,
    }

def main():
    print("🔧 CALIBRAÇÃO AUTOMÁTICA DO TEMPLATE OMR")
    print("=" * 60)
    
    # 1. Converter PDF para imagem
    print(f"\n📄 Carregando template: {TEMPLATE_PATH}")
    image = pdf_to_image(TEMPLATE_PATH)
    print(f"  Dimensões: {image.shape[1]}x{image.shape[0]}px")
    
    # 2. Detectar círculos
    print("\n🔍 Detectando círculos...")
    circles = detect_circles(image)
    print(f"  Total de círculos detectados: {len(circles)}")
    
    if len(circles) == 0:
        print("❌ ERRO: Nenhum círculo detectado!")
        return
    
    # 3. Agrupar em linhas e colunas
    print("\n📐 Agrupando círculos...")
    rows = group_circles_by_row_and_column(circles)
    analyze_structure(rows)
    
    # 4. Construir configuração
    try:
        config = build_template_config(rows)
        
        # 5. Salvar configuração
        with open(OUTPUT_PATH, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"\n💾 Configuração salva em: {OUTPUT_PATH}")
        print("\n🎯 Próximo passo: Copie esses valores para build_enem90_v5_template() no app.py")
        
    except Exception as e:
        print(f"\n❌ ERRO ao construir configuração: {e}")
        
        # Salvar imagem com círculos marcados para debug
        debug_img = image.copy()
        for row_idx, row in enumerate(rows):
            for circle in row:
                cv2.circle(debug_img, (circle[0], circle[1]), circle[2], (0, 255, 0), 2)
                cv2.putText(debug_img, str(row_idx), (circle[0]-10, circle[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        
        debug_path = Path(__file__).parent / "debug_circles.png"
        cv2.imwrite(str(debug_path), debug_img)
        print(f"📸 Imagem de debug salva em: {debug_path}")

if __name__ == "__main__":
    main()

