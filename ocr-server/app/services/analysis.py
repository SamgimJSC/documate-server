import logging

from pydantic import ValidationError

from app import repositories as repo
from app.config import settings
from app.s3 import download_object
from app.ocr import extract_text
from app.llm import classify_document
from app.models import validate_result

logger = logging.getLogger("ocr.analysis")


class AnalysisError(Exception):
    """분석 도중 발생한 복구 불가 오류. 워커가 받아 FAILED 처리한다."""


def analyze(temp_document_id: str) -> None:
    """임시 문서 한 건의 OCR → LLM 분류 → 검증 → DB 저장 전체 플로우.

    소스: temp_documents / temp_files (분석 후에도 보존)
    결과: documents 또는 receipts 에 새 행 생성, temp_documents.ai_status 갱신

    실패 판정(spec):
      1) OCR 텍스트 추출 실패
      2) ai_confidence(OCR+LLM 평균) < AI_CONFIDENCE_THRESHOLD
      3) Pydantic 검증을 LLM_FORMAT_MAX_RETRIES 회 시도해도 실패
    위 경우 AnalysisError 를 던져 호출부(워커)가 FAILED 로 마감한다.
    """
    temp_doc = repo.fetch_temp_document(temp_document_id)
    if temp_doc is None:
        raise AnalysisError(f"temp document not found: {temp_document_id}")

    repo.mark_processing(temp_document_id)

    files = repo.fetch_temp_files(temp_document_id)
    if not files:
        raise AnalysisError(f"no files for temp document: {temp_document_id}")

    # 1) OCR — 텍스트 + 평균 신뢰도
    ocr_text, ocr_confidence = _run_ocr(files)
    if not ocr_text.strip():
        raise AnalysisError(f"OCR produced no text: {temp_document_id}")

    # 2) LLM 분류/포매팅 + Pydantic 검증 (최대 N회 재시도)
    result = _classify_with_validation(ocr_text, temp_document_id)

    # 3) ai_confidence = OCR 평균 + LLM confidence 평균 → 임계치 미만이면 FAILED
    llm_confidence = result["confidence"] if result["confidence"] is not None else 0.0
    ai_confidence = round((ocr_confidence + llm_confidence) / 2, 2)
    if ai_confidence < settings.AI_CONFIDENCE_THRESHOLD:
        raise AnalysisError(
            f"low confidence {ai_confidence} (ocr={ocr_confidence}, llm={llm_confidence}): {temp_document_id}"
        )

    extracted_data = dict(result["extracted_data"])
    extracted_data["_meta"] = {
        "type": result["type"],
        "confidence": ai_confidence,
        "ocr_confidence": ocr_confidence,
        "llm_confidence": llm_confidence,
        "ocr_engine": "PaddleOCR",
        "model": settings.OLLAMA_MODEL,
    }

    # 4) DB 저장 (새 행 생성)
    if result["type"] == "RECEIPT":
        _save_receipt(temp_doc, files, ocr_text, result, extracted_data, ai_confidence)
    else:
        _save_document(temp_doc, files, ocr_text, result, extracted_data, ai_confidence)

    # 5) 임시 문서 상태를 DONE 으로 마감 (원본 데이터는 보존)
    repo.mark_done(temp_document_id)
    logger.info(
        "analysis done: %s (%s, confidence=%.2f)",
        temp_document_id,
        result["type"],
        ai_confidence,
    )


def _run_ocr(files: list[dict]) -> tuple[str, float]:
    """모든 페이지를 OCR 해 합친 텍스트와 페이지 평균 신뢰도를 반환한다."""
    pages: list[str] = []
    confidences: list[float] = []
    for f in files:
        image_bytes = download_object(f["file_url"])
        ocr = extract_text(image_bytes)
        pages.append(f"[p{f['page_no']}]\n{ocr.text}")
        confidences.append(ocr.confidence)

    avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else 0.0
    return "\n\n".join(pages), avg_conf


def _classify_with_validation(ocr_text: str, temp_document_id: str) -> dict:
    """LLM 분류 결과가 Pydantic 검증을 통과할 때까지 재시도한다.

    LLM_FORMAT_MAX_RETRIES 회 모두 실패하면 AnalysisError.
    """
    last_error: Exception | None = None
    for attempt in range(1, settings.LLM_FORMAT_MAX_RETRIES + 1):
        # 첫 시도는 결정적(0.0), 이후 재시도는 temperature 를 올려 다른 결과를 유도한다.
        temperature = 0.0 if attempt == 1 else min(0.2 * (attempt - 1), 0.8)
        result = classify_document(ocr_text, temperature=temperature)
        try:
            validate_result(result)
            return result
        except ValidationError as e:
            last_error = e
            logger.warning(
                "validation failed (%d/%d) for %s: %s",
                attempt,
                settings.LLM_FORMAT_MAX_RETRIES,
                temp_document_id,
                e.errors(),
            )

    raise AnalysisError(
        f"validation failed after {settings.LLM_FORMAT_MAX_RETRIES} retries: {temp_document_id} ({last_error})"
    )


def _file_type_from_url(file_url: str) -> str | None:
    """파일 URL 확장자로 documents.file_type(enum: JPG|PNG) 을 추정한다."""
    u = file_url.lower()
    if u.endswith(".png"):
        return "PNG"
    if u.endswith(".jpg") or u.endswith(".jpeg"):
        return "JPG"
    return None


def _save_document(temp_doc, files, ocr_text, result, extracted_data, ai_confidence) -> None:
    category_id = repo.resolve_document_category_id(result["category_code"])
    file_type = _file_type_from_url(files[0]["file_url"]) if files else None

    document_id = repo.insert_document(
        user_id=temp_doc["user_id"],
        category_id=category_id,
        title=result["title"],
        file_type=file_type,
        page_count=len(files),
        ocr_text=ocr_text,
        extracted_data=extracted_data,
        ai_confidence=ai_confidence,
        issue_date=result["issue_date"],
        expiry_date=result["expiry_date"],
        renewal_date=result["renewal_date"],
    )
    repo.add_activity(document_id, "AI_ANALYZED", "AI 문서 분석 완료")


def _save_receipt(temp_doc, files, ocr_text, result, extracted_data, ai_confidence) -> None:
    spend_category_id = repo.resolve_spend_category_id(result["spend_category_name"])
    file_url = files[0]["file_url"] if files else None

    repo.insert_receipt(
        user_id=temp_doc["user_id"],
        spend_category_id=spend_category_id,
        file_url=file_url,
        store_name=result["store_name"],
        store_address=result["store_address"],
        total_amount=result["total_amount"],
        purchase_date=result["purchase_date"],
        payment_item=result["payment_item"],
        ocr_text=ocr_text,
        extracted_data=extracted_data,
    )
