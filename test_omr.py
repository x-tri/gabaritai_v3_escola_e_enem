#!/usr/bin/env python3
"""
Script para testar o OMR com PDF de gabaritos.
Converte PDF em imagens e envia cada página para o serviço OMR.
"""

import os
import sys
import io
import requests
from pdf2image import convert_from_path
from PIL import Image

# URL do serviço OMR (Fly.io ou local)
OMR_URL = os.getenv('PYTHON_OMR_URL', 'https://xtri-gabaritos-omr.fly.dev')

def test_pdf(pdf_path: str):
    """Testa todas as páginas do PDF com o OMR."""
    print(f"\n{'='*60}")
    print(f"Testando PDF: {pdf_path}")
    print(f"OMR Service: {OMR_URL}")
    print(f"{'='*60}\n")

    # Converter PDF em imagens
    print("Convertendo PDF para imagens...")
    try:
        images = convert_from_path(pdf_path, dpi=200)
        print(f"Total de páginas: {len(images)}\n")
    except Exception as e:
        print(f"Erro ao converter PDF: {e}")
        return

    results = []

    for i, img in enumerate(images, 1):
        print(f"--- Página {i}/{len(images)} ---")

        # Converter imagem para bytes (JPEG)
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG', quality=95)
        img_bytes.seek(0)

        # Enviar para o OMR
        try:
            files = {'image': ('page.jpg', img_bytes, 'image/jpeg')}
            data = {'page': i}

            response = requests.post(
                f"{OMR_URL}/api/process-sheet",
                files=files,
                data=data,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()

                sheet_code = result.get('sheet_code', 'N/A')
                day = result.get('day', 'N/A')
                start_q = result.get('start_question', 'N/A')
                answered = result.get('stats', {}).get('answered', 0)
                blank = result.get('stats', {}).get('blank', 0)
                double = result.get('stats', {}).get('double_marked', 0)
                total_ms = result.get('timings', {}).get('total_ms', 0)

                # Obter respostas numeradas
                answers_numbered = result.get('answers_numbered', {})

                print(f"  QR Code: {sheet_code}")
                print(f"  Dia: {day} (start_question: {start_q})")
                print(f"  Respondidas: {answered}/90")
                print(f"  Em branco: {blank}")
                print(f"  Dupla marcação: {double}")
                print(f"  Tempo: {total_ms}ms")

                # Mostrar primeiras 10 respostas
                if answers_numbered:
                    keys = sorted(answers_numbered.keys(), key=lambda x: int(x))[:10]
                    sample = {k: answers_numbered[k] for k in keys}
                    print(f"  Primeiras respostas: {sample}")

                results.append({
                    'page': i,
                    'sheet_code': sheet_code,
                    'day': day,
                    'answered': answered,
                    'blank': blank,
                    'double': double,
                    'status': 'OK'
                })
            else:
                error = response.text[:200]
                print(f"  ERRO HTTP {response.status_code}: {error}")
                results.append({
                    'page': i,
                    'status': 'ERRO',
                    'error': error
                })

        except Exception as e:
            print(f"  ERRO: {e}")
            results.append({
                'page': i,
                'status': 'ERRO',
                'error': str(e)
            })

        print()

    # Resumo
    print(f"\n{'='*60}")
    print("RESUMO")
    print(f"{'='*60}")

    ok = sum(1 for r in results if r['status'] == 'OK')
    errors = len(results) - ok

    print(f"Total de páginas: {len(results)}")
    print(f"Processadas OK: {ok}")
    print(f"Erros: {errors}")

    if errors > 0:
        print("\nPáginas com erro:")
        for r in results:
            if r['status'] != 'OK':
                print(f"  - Página {r['page']}: {r.get('error', 'Erro desconhecido')}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python test_omr.py <arquivo.pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Arquivo não encontrado: {pdf_path}")
        sys.exit(1)

    test_pdf(pdf_path)
