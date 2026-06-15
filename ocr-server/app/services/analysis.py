import logging

from app import repositories as repo
from app.s3 import download_object
from app.ocr import extract_text
from app.llm import classify_document

logger = logging.getLogger("ocr.analysis")


class AnalysisError(Exception):
    """분석 도중 발생한 복구 불가 오류."""


def analyze(document_id: str) -> None:
    """문서 한 건에 대한 OCR → LLM 분류 → DB 저장 전체 플로우를 수행한다."""
    document = repo.fetch_document(document_id)
    if document is None:
        raise AnalysisError(f"document not found: {document_id}")
    if document.get("is_deleted"):
        logger.info("skip deleted document: %s", document_id)
        return

    repo.mark_processing(document_id)

    files = repo.fetch_files(document_id)
    if not files:
        raise AnalysisError(f"no files for document: {document_id}")

    ocr_text = _run_ocr(files)
    result = classify_document(ocr_text)

    extracted_data = dict(result["extracted_data"])
    extracted_data["_meta"] = {
        "type": result["type"],
        "confidence": result["confidence"],
    }

    if result["type"] == "RECEIPT":
        _save_receipt(document, files, ocr_text, result, extracted_data)
    else:
        _save_document(document, files, ocr_text, result, extracted_data)

    logger.info("analysis done: %s (%s)", document_id, result["type"])


def _run_ocr(files: list[dict]) -> str:
    pages: list[str] = []
    for f in files:
        image_bytes = download_object(f["file_url"])
        text = extract_text(image_bytes)
        pages.append(f"[p{f['page_no']}]\n{text}")
    return "\n\n".join(pages)


def _save_document(document, files, ocr_text, result, extracted_data) -> None:
    document_id = document["document_id"]
    category_id = repo.resolve_document_category_id(result["category_code"])

    repo.save_document_result(
        document_id,
        category_id=category_id,
        ocr_text=ocr_text,
        extracted_data=extracted_data,
        ai_confidence=result["confidence"],
        issue_date=result["issue_date"],
        expiry_date=result["expiry_date"],
        renewal_date=result["renewal_date"],
        page_count=len(files),
    )
    repo.add_activity(document_id, "AI_ANALYZED", "AI 문서 분석 완료")


def _save_receipt(document, files, ocr_text, result, extracted_data) -> None:
    """영수증으로 분류 → receipts 행 생성 + 원본 documents 행도 DONE 처리."""
    document_id = document["document_id"]
    spend_category_id = repo.resolve_spend_category_id(result["spend_category_name"])
    file_url = files[0]["file_url"] if files else None

    receipt_id = repo.insert_receipt(
        user_id=document["user_id"],
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

    # 원본 documents 행과 생성된 receipt 를 연결하고 상태를 DONE 으로 마감한다.
    extracted_data["_meta"]["receipt_id"] = receipt_id
    repo.save_document_result(
        document_id,
        category_id=None,
        ocr_text=ocr_text,
        extracted_data=extracted_data,
        ai_confidence=result["confidence"],
        issue_date=None,
        expiry_date=None,
        renewal_date=None,
        page_count=len(files),
    )
    repo.add_activity(document_id, "AI_ANALYZED", "AI 영수증 분석 완료")
