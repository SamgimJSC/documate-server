import io

import numpy as np
from PIL import Image

from app.config import settings

_ocr = None


def _engine():
    """PaddleOCR 인스턴스를 지연 초기화한다 (모델 로딩이 무겁다)."""
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR

        _ocr = PaddleOCR(use_angle_cls=True, lang=settings.OCR_LANG)
    return _ocr


def _image_to_array(image_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(image)


def extract_text(image_bytes: bytes) -> str:
    """이미지 한 장에서 텍스트를 추출해 줄바꿈으로 연결한 문자열을 반환한다."""
    arr = _image_to_array(image_bytes)
    result = _engine().ocr(arr, cls=True)

    lines: list[str] = []
    # PaddleOCR 반환 형태: [[ [box, (text, score)], ... ]] (페이지 단위 래핑)
    for page in result or []:
        for line in page or []:
            try:
                text = line[1][0]
            except (IndexError, TypeError):
                continue
            if text:
                lines.append(text)

    return "\n".join(lines)
