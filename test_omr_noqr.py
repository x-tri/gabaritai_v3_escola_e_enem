#!/usr/bin/env python3
"""
Testa OMR sem exigir QR Code (usa /api/process-image).
"""

import os
import io
import requests
from pdf2image import convert_from_path

OMR_URL = os.getenv('PYTHON_OMR_URL', 'https://xtri-gabaritos-omr.fly.dev')

def test_pages_without_qr(pdf_path: str, pages: list):
    """Testa páginas específicas usando endpoint sem QR."""
    print(f"\nTestando páginas {pages} SEM verificação de QR Code")
    print(f"OMR Service: {OMR_URL}/api/process-image\n")

    images = convert_from_path(pdf_path, dpi=200)

    for page_num in pages:
        idx = page_num - 1
        if idx >= len(images):
            continue

        print(f"--- Página {page_num} ---")
        img = images[idx]

        # Converter para bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG', quality=95)
        img_bytes.seek(0)

        try:
            files = {'image': ('page.jpg', img_bytes, 'image/jpeg')}
            data = {'page': page_num}

            response = requests.post(
                f"{OMR_URL}/api/process-image",
                files=files,
                data=data,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()

                if result.get('status') == 'sucesso':
                    pagina = result.get('pagina', {}).get('resultado', {})
                    respondidas = pagina.get('respondidas', 0)
                    branco = pagina.get('em_branco', 0)
                    dupla = pagina.get('dupla_marcacao', 0)
                    elapsed = result.get('pagina', {}).get('elapsed_ms', 0)

                    questoes = pagina.get('questoes', [])

                    print(f"  Respondidas: {respondidas}/90")
                    print(f"  Em branco: {branco}")
                    print(f"  Dupla marcação: {dupla}")
                    print(f"  Tempo: {elapsed}ms")

                    # Mostrar primeiras 10 respostas
                    sample = [(q['numero'], q['resposta']) for q in questoes[:10] if q.get('resposta')]
                    print(f"  Primeiras respostas: {sample}")
                else:
                    print(f"  ERRO: {result.get('mensagem')}")
            else:
                print(f"  HTTP {response.status_code}: {response.text[:200]}")

        except Exception as e:
            print(f"  ERRO: {e}")

        print()


if __name__ == '__main__':
    # Testar páginas que falharam no QR
    failed_pages = [7, 8, 10, 18]
    test_pages_without_qr("test_3A_DIA1.pdf", failed_pages)
