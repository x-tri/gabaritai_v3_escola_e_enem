#!/usr/bin/env python3
"""
Script de Teste de Leitura OMR
Simula a leitura de um gabarito sem alterar configurações do sistema
"""

import sys
import requests
import json
from pathlib import Path
from pdf2image import convert_from_path
import io

# Configuração
OMR_SERVICE_URL = "http://localhost:5002"
TEST_PDF = Path(__file__).parent.parent / "data" / "teste.pdf"
GABARITO_ESPERADO = [
    "A", "E", "A", "E", "D", "E", "A", "B", "D", "A",  # Q1-10
    "E", "D", "B", "D", "A", "B", "D", "D", "D", "A",  # Q11-20
    "B", "D", "C", "E", "C", "D", "C", "B", "D", "C",  # Q21-30
    "A", "A", "D", "E", "B", "B", "C", "D", "B", "A",  # Q31-40
    "A", "D", "D", "D", "D", "E", "D", "E", "D", "D",  # Q41-50
    "B", "D", "B", "C", "A", "E", "C", "E", "C", "C",  # Q51-60
    "D", "C", "C", "E", "B", "E", "E", "A", "C", "E",  # Q61-70
    "D", "D", "D", "E", "A", "A", "D", "E", "B", "E",  # Q71-80
    "E", "D", "E", "A", "B", "B", "C", "A", "C", "C"   # Q81-90
]

def test_omr_service():
    """Testa se o serviço OMR está disponível"""
    try:
        response = requests.get(f"{OMR_SERVICE_URL}/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Serviço OMR Online")
            print(f"   Template: {data.get('default_template')}")
            print(f"   Status: {data.get('status')}")
            return True
        return False
    except Exception as e:
        print(f"❌ Serviço OMR Offline: {e}")
        return False

def convert_pdf_to_png(pdf_path):
    """Converte PDF para PNG"""
    print(f"\n📄 Convertendo PDF para imagem...")
    images = convert_from_path(str(pdf_path), dpi=300)
    print(f"   Páginas: {len(images)}")
    
    # Converter primeira página para bytes PNG
    img_byte_arr = io.BytesIO()
    images[0].save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    print(f"   Tamanho da imagem: {len(img_byte_arr.getvalue()) / 1024:.2f} KB")
    return img_byte_arr.getvalue()

def call_omr_service(image_bytes):
    """Chama o serviço OMR Python"""
    print(f"\n🔍 Enviando para o serviço OMR...")
    
    try:
        response = requests.post(
            f"{OMR_SERVICE_URL}/api/process-image",
            files={'image': ('test.png', image_bytes, 'image/png')},
            data={'template_name': 'enem90_v5'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ OMR processado com sucesso")
            return result
        else:
            print(f"❌ Erro no OMR: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro ao chamar OMR: {e}")
        return None

def compare_answers(detected, expected):
    """Compara respostas detectadas com gabarito esperado"""
    print(f"\n📊 COMPARAÇÃO DE RESPOSTAS:")
    print(f"=" * 80)
    
    correct = 0
    wrong = 0
    errors = []
    
    for i, (det, exp) in enumerate(zip(detected, expected), 1):
        if det == exp:
            correct += 1
        else:
            wrong += 1
            errors.append((i, det, exp))
    
    # Mostrar estatísticas
    accuracy = (correct / len(expected)) * 100
    print(f"\n✅ Acertos: {correct}/{len(expected)} ({accuracy:.1f}%)")
    print(f"❌ Erros: {wrong}/{len(expected)}")
    
    # Mostrar primeiros 10 erros (se houver)
    if errors:
        print(f"\n⚠️  PRIMEIROS {min(10, len(errors))} ERROS:")
        print(f"{'Q':<5} {'Detectado':<12} {'Esperado':<12}")
        print(f"-" * 35)
        for q_num, det, exp in errors[:10]:
            print(f"{q_num:<5} {det:<12} {exp:<12}")
    
    # Mostrar todas as respostas em formato de grid
    print(f"\n📋 TODAS AS RESPOSTAS DETECTADAS:")
    print(f"=" * 80)
    for i in range(0, len(detected), 10):
        chunk = detected[i:i+10]
        q_range = f"Q{i+1:02d}-Q{min(i+10, len(detected)):02d}:"
        answers = " ".join([f"{i+j+1:02d}:{ans}" for j, ans in enumerate(chunk)])
        
        # Colorir erros
        if expected:
            chunk_expected = expected[i:i+10]
            answers_colored = []
            for j, (det, exp) in enumerate(zip(chunk, chunk_expected)):
                q_num = i + j + 1
                if det == exp:
                    answers_colored.append(f"{q_num:02d}:{det}")
                else:
                    answers_colored.append(f"{q_num:02d}:\033[91m{det}\033[0m (esperado {exp})")
            print(f"{q_range:<12} {' '.join(answers_colored)}")
        else:
            print(f"{q_range:<12} {answers}")
    
    return accuracy

def main():
    print("🧪 TESTE DE LEITURA OMR")
    print("=" * 80)
    print(f"📁 Arquivo de teste: {TEST_PDF.name}")
    print(f"🔧 Template padrão: Modelo de cartão - menor.pdf (NÃO será alterado)")
    print("=" * 80)
    
    # Verificar se arquivo existe
    if not TEST_PDF.exists():
        print(f"❌ ERRO: Arquivo não encontrado: {TEST_PDF}")
        return 1
    
    # 1. Verificar serviço OMR
    if not test_omr_service():
        return 1
    
    # 2. Converter PDF para PNG
    try:
        image_bytes = convert_pdf_to_png(TEST_PDF)
    except Exception as e:
        print(f"❌ Erro ao converter PDF: {e}")
        return 1
    
    # 3. Chamar serviço OMR
    result = call_omr_service(image_bytes)
    if not result:
        return 1
    
    # Debug: Mostrar estrutura do resultado
    print(f"\n🔍 DEBUG - Estrutura da resposta:")
    print(f"   Chaves disponíveis: {list(result.keys())}")
    if 'answers' in result:
        print(f"   Tipo de 'answers': {type(result['answers'])}")
        print(f"   Tamanho de 'answers': {len(result.get('answers', []))}")
    if 'questions' in result:
        print(f"   Tipo de 'questions': {type(result['questions'])}")
        print(f"   Tamanho de 'questions': {len(result.get('questions', []))}")
    
    # 4. Extrair respostas detectadas
    detected_answers = []
    
    # Tentar diferentes formatos de resposta
    if 'pagina' in result and 'resultado' in result['pagina']:
        # Formato Python OMR Service
        questoes_dict = result['pagina']['resultado'].get('questoes', {})
        print(f"   ✅ Usando formato Python OMR (dict de questões)")
        
        # Converter dict para array ordenado
        for i in range(1, 91):
            answer = questoes_dict.get(str(i))
            detected_answers.append(answer if answer else "∅")
            
    elif 'answers' in result and isinstance(result['answers'], list):
        detected_answers = result['answers']
        print(f"   ✅ Usando formato 'answers' (array direto)")
        
    elif 'questions' in result:
        questions = result.get('questions', [])
        print(f"   ✅ Usando formato 'questions' (array de objetos)")
        
        for q in sorted(questions, key=lambda x: x['id']):
            answer = q.get('answer')
            detected_answers.append(answer if answer else "∅")
    else:
        print(f"   ❌ Formato de resposta desconhecido!")
        print(f"   Resposta completa: {json.dumps(result, indent=2)[:500]}...")
        return 1
    
    print(f"\n📝 Total de questões detectadas: {len(detected_answers)}")
    
    # 5. Comparar com gabarito esperado (se disponível)
    if GABARITO_ESPERADO:
        accuracy = compare_answers(detected_answers, GABARITO_ESPERADO)
        
        if accuracy >= 95:
            print(f"\n🎉 EXCELENTE! Precisão >= 95%")
            return 0
        elif accuracy >= 80:
            print(f"\n⚠️  BOA precisão, mas há margem para melhoria")
            return 0
        else:
            print(f"\n❌ Precisão BAIXA! Necessário recalibrar o template")
            return 1
    else:
        # Apenas mostrar resultados sem comparar
        print(f"\n📋 RESPOSTAS DETECTADAS:")
        for i in range(0, len(detected_answers), 10):
            chunk = detected_answers[i:i+10]
            q_range = f"Q{i+1:02d}-Q{min(i+10, len(detected_answers)):02d}:"
            answers = " ".join([f"{ans}" for ans in chunk])
            print(f"{q_range:<12} {answers}")
        
        return 0

if __name__ == "__main__":
    sys.exit(main())

