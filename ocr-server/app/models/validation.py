from pydantic import BaseModel

from .document import DocumentResult
from .receipt import ReceiptResult


def validate_result(result: dict) -> BaseModel:
    """정규화된 LLM 결과를 type 에 따라 알맞은 Pydantic 모델로 검증한다.

    검증 실패 시 pydantic.ValidationError 를 던지며, 호출부에서 재시도한다.
    """
    if result.get("type") == "RECEIPT":
        return ReceiptResult(**result)
    return DocumentResult(**result)
