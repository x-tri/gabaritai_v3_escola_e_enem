#!/usr/bin/env python3
"""
Debug QR detection on specific pages.
"""

import os
import io
from pdf2image import convert_from_path
from PIL import Image

def debug_pages(pdf_path: str, pages: list):
    """Save specific pages as images for debugging."""
    print(f"Convertendo PDF: {pdf_path}")
    images = convert_from_path(pdf_path, dpi=200)

    os.makedirs("debug_pages", exist_ok=True)

    for page_num in pages:
        idx = page_num - 1
        if idx < len(images):
            img = images[idx]
            output_path = f"debug_pages/page_{page_num}.jpg"
            img.save(output_path, "JPEG", quality=95)
            print(f"Salvo: {output_path} ({img.width}x{img.height})")

            # Crop QR code region (top-right corner)
            width, height = img.size
            # QR code typically in top-right, approximately
            qr_region = img.crop((width - 200, 50, width - 20, 200))
            qr_path = f"debug_pages/page_{page_num}_qr.jpg"
            qr_region.save(qr_path, "JPEG", quality=95)
            print(f"  QR crop: {qr_path}")


if __name__ == '__main__':
    failed_pages = [7, 8, 10, 18]
    # Also include a successful page for comparison
    debug_pages("test_3A_DIA1.pdf", failed_pages + [1])
