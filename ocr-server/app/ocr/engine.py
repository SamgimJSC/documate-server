import io
from dataclasses import dataclass

import numpy as np
from PIL import Image

from app.config import settings

_ocr = None


@dataclass
class OcrResult:
    """OCR 한 장(또는 묶음)의 결과."""

    text: str
    # 인식된 토큰별 신뢰도의 평균 (0~100). 추출이 없으면 0.0
    confidence: float


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


def _parse_result(result) -> tuple[list[str], list[float]]:
    """PaddleOCR 버전별 반환 형태를 (texts, scores) 로 정규화한다.

    - 2.x: result = [[ [box, (text, score)], ... ]]  (페이지 래핑)
    - 3.x: result = [ {"rec_texts": [...], "rec_scores": [...]} , ... ]
    """
    texts: list[str] = []
    scores: list[float] = []

    for page in result or []:
        # 3.x predict() dict 형태
        if isinstance(page, dict):
            rec_texts = page.get("rec_texts") or []
            rec_scores = page.get("rec_scores") or []
            for i, t in enumerate(rec_texts):
                if not t:
                    continue
                texts.append(str(t))
                try:
                    scores.append(float(rec_scores[i]))
                except (IndexError, TypeError, ValueError):
                    pass
            continue

        # 2.x list 형태: [ [box, (text, score)], ... ]
        for line in page or []:
            try:
                text = line[1][0]
                score = float(line[1][1])
            except (IndexError, TypeError, ValueError):
                continue
            if text:
                texts.append(str(text))
                scores.append(score)

    return texts, scores


def extract_text(image_bytes: bytes) -> OcrResult:
    """이미지 한 장에서 텍스트와 평균 신뢰도를 추출한다.

    신뢰도는 PaddleOCR 토큰 점수(0~1)의 평균을 100점 척도로 환산한 값이다.
    """
    arr = _image_to_array(image_bytes)
    engine = _engine()

    # 3.x 는 ocr() 가 deprecated 일 수 있어 predict() 우선 시도.
    if hasattr(engine, "predict"):
        try:
            result = engine.predict(arr)
        except Exception:
            result = engine.ocr(arr)
    else:
        result = engine.ocr(arr, cls=True)

    texts, scores = _parse_result(result)
    confidence = (sum(scores) / len(scores) * 100.0) if scores else 0.0

    return OcrResult(text="\n".join(texts), confidence=round(confidence, 2))
