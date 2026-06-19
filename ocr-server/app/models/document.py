from pydantic import BaseModel, field_validator

from app.llm.classifier import DOCUMENT_CATEGORY_CODES


class DocumentResult(BaseModel):
    """documents 테이블에 저장하기 전, LLM 출력의 DOCUMENT 분류 검증 모델."""

    category_code: str
    title: str | None = None
    issue_date: str | None = None
    expiry_date: str | None = None
    renewal_date: str | None = None
    extracted_data: dict = {}

    @field_validator("category_code")
    @classmethod
    def _known_code(cls, v: str) -> str:
        if v not in DOCUMENT_CATEGORY_CODES:
            raise ValueError(f"unknown category_code: {v}")
        return v
