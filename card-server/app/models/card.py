from pydantic import BaseModel, Field, field_validator


class CardListItem(BaseModel):
    """TOP100 목록에서 수집한 상세페이지 진입 정보."""

    # 카드고릴라 카드 ID (URL 의 /card/detail/{id} 값). UPSERT 자연키로 쓰이는 source_url 을 만든다.
    card_gorilla_id: str
    detail_url: str
    rank: int | None = None


class Card(BaseModel):
    """DB `cards` 테이블에 저장할 정규화된 카드 데이터.

    실제 컬럼(src/admin/entities/card.entity.ts):
      card_id(uuid, 자동생성) / card_name / issuer / benefits(jsonb)
      annual_fee(numeric) / img_url / source_url / crawled_at
    card_id, crawled_at 은 DB 에서 채우므로 여기서는 다루지 않는다.
    """

    card_name: str = Field(min_length=1, max_length=100)
    issuer: str | None = Field(default=None, max_length=50)
    # 구조화된 혜택. 예: {"summary": [...], "categories": {...}}
    benefits: dict | None = None
    # 연회비(원). 국내/해외 중 대표값(보통 국내). numeric(10,0) → 정수.
    annual_fee: int | None = None
    img_url: str | None = Field(default=None, max_length=500)
    # UPSERT 자연키. 카드고릴라 상세 URL.
    source_url: str = Field(max_length=500)

    @field_validator("issuer", "img_url", "card_name", mode="before")
    @classmethod
    def _strip(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("annual_fee")
    @classmethod
    def _non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("annual_fee must be >= 0")
        return v
