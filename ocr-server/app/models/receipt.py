from pydantic import BaseModel, field_validator


class ReceiptResult(BaseModel):
    """receipts 테이블에 저장하기 전, LLM 출력의 RECEIPT 분류 검증 모델.

    store_name / total_amount 는 DB NOT NULL 컬럼이므로 여기서 필수로 강제한다.
    값이 비어 있으면 검증 실패 → LLM 포매팅을 재시도한다 (spec, 최대 5회).
    """

    store_name: str
    total_amount: float
    purchase_date: str | None = None
    store_address: str | None = None
    payment_item: str | None = None
    spend_category_name: str | None = None
    extracted_data: dict = {}

    @field_validator("store_name")
    @classmethod
    def _store_name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("store_name is required")
        return v.strip()

    @field_validator("total_amount")
    @classmethod
    def _amount_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("total_amount must be >= 0")
        return v
