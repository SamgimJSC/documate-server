import json
import threading

from ollama import Client

from app.config import settings

# documents.category_id 에 매핑되는 분류 코드 (document_categories.code)
# NestJS DocumentCategoryCode enum 과 일치시킨다.
DOCUMENT_CATEGORY_CODES = [
    "CONTRACT",
    "MEDICAL",
    "WARRANTY",
    "ETC",
]

# receipts 의 소비 카테고리 (spend_categories.name)
# NOTE: 실제 DB 의 spend_categories.name 시드 값과 일치해야 매핑된다.
#       일치하지 않으면 spend_category_id 는 NULL 로 저장된다.
SPEND_CATEGORY_NAMES = ["식비", "카페", "교통", "쇼핑", "의료", "기타"]

# 로컬 LLM 동시 호출 제한 (OOM 방지). 모든 OCR 워커 스레드가 공유한다.
_llm_lock = threading.Semaphore(settings.LLM_CONCURRENCY)

_client: Client | None = None


def _ollama() -> Client:
    global _client
    if _client is None:
        _client = Client(host=settings.OLLAMA_HOST, timeout=settings.OLLAMA_TIMEOUT)
    return _client


_SYSTEM_PROMPT = (
    "너는 한국어 문서/영수증 분석기다. OCR 로 추출한 텍스트를 보고 "
    "문서 종류를 분류하고 핵심 정보를 구조화한다. "
    "반드시 지정된 JSON 스키마만 출력하고 그 외 설명은 하지 않는다. "
    "값을 확신할 수 없으면 null 을 사용한다. 날짜는 YYYY-MM-DD 형식으로 변환한다. "
    "confidence 는 분석 신뢰도를 0~100 사이 숫자로 평가해서 넣어라."
)

_USER_TEMPLATE = """다음 OCR 텍스트를 분석해 JSON 으로만 답하라.

[OCR 텍스트]
{ocr_text}

[출력 JSON 스키마]
{{
  "type": "RECEIPT 또는 DOCUMENT",
  "confidence": "분류/추출 신뢰도 0~100 사이 숫자",
  "category_code": "type 이 DOCUMENT 일 때만. 다음 중 하나: {doc_codes}",
  "title": "문서 제목 (DOCUMENT)",
  "issue_date": "발급/계약 시작일 (DOCUMENT, 없으면 null)",
  "expiry_date": "만료일 (DOCUMENT, 없으면 null)",
  "renewal_date": "갱신일 (DOCUMENT, 없으면 null)",
  "store_name": "가맹점명 (RECEIPT)",
  "store_address": "가맹점 주소 (RECEIPT, 없으면 null)",
  "total_amount": "결제 총액 숫자만 (RECEIPT)",
  "purchase_date": "결제일 (RECEIPT)",
  "payment_item": "주요 결제 항목/품목 (RECEIPT, 없으면 null)",
  "spend_category_name": "type 이 RECEIPT 일 때만. 다음 중 하나: {spend_names}",
  "extracted_data": "추출한 핵심 정보 key-value 객체 (인물/금액/번호 등)"
}}
"""


def _build_prompt(ocr_text: str) -> str:
    return _USER_TEMPLATE.format(
        ocr_text=ocr_text.strip() or "(텍스트 없음)",
        doc_codes=", ".join(DOCUMENT_CATEGORY_CODES),
        spend_names=", ".join(SPEND_CATEGORY_NAMES),
    )


def classify_document(ocr_text: str, temperature: float = 0.0) -> dict:
    """Ollama 로컬 LLM 으로 텍스트를 분류/추출해 정규화된 dict 로 반환한다.

    동시 호출은 LLM_CONCURRENCY 만큼만 허용한다 (세마포어).
    재시도 시 temperature 를 올리면 같은 입력에도 다른 추출 결과를 유도할 수 있다.
    """
    with _llm_lock:
        resp = _ollama().generate(
            model=settings.OLLAMA_MODEL,
            prompt=_build_prompt(ocr_text),
            system=_SYSTEM_PROMPT,
            format="json",
            stream=False,
            options={"temperature": temperature},
        )

    raw = resp.get("response", "{}")
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        parsed = {}

    return _normalize(parsed)


def _normalize(data: dict) -> dict:
    """LLM 출력을 DB 저장에 안전한 형태로 정규화한다.

    문서 대분류는 미분류 시 document 의 ETC 로 떨어뜨린다 (spec).
    영수증 필수값(store_name/total_amount)은 None 으로 두어 검증 단계에서 잡는다.
    """
    doc_type = str(data.get("type", "")).upper()
    if doc_type not in ("RECEIPT", "DOCUMENT"):
        doc_type = "DOCUMENT"

    category_code = data.get("category_code")
    if doc_type == "DOCUMENT" and category_code not in DOCUMENT_CATEGORY_CODES:
        category_code = "ETC"
    if doc_type == "RECEIPT":
        category_code = None

    spend_name = data.get("spend_category_name")
    if spend_name not in SPEND_CATEGORY_NAMES:
        spend_name = "기타" if doc_type == "RECEIPT" else None

    extracted = data.get("extracted_data")
    if not isinstance(extracted, dict):
        extracted = {}

    return {
        "type": doc_type,
        "confidence": _as_float(data.get("confidence")),
        "category_code": category_code,
        "title": _as_str(data.get("title")),
        "issue_date": _as_str(data.get("issue_date")),
        "expiry_date": _as_str(data.get("expiry_date")),
        "renewal_date": _as_str(data.get("renewal_date")),
        "store_name": _as_str(data.get("store_name")),
        "store_address": _as_str(data.get("store_address")),
        "total_amount": _as_float(data.get("total_amount")),
        "purchase_date": _as_str(data.get("purchase_date")),
        "payment_item": _as_str(data.get("payment_item")),
        "spend_category_name": spend_name,
        "extracted_data": extracted,
    }


def _as_str(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_float(value):
    if value is None:
        return None
    try:
        return float(str(value).replace(",", "").replace("원", "").strip())
    except (ValueError, TypeError):
        return None
