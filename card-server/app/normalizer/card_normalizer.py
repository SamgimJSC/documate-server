from __future__ import annotations

import re

from app.models import Card, CardListItem

# "10,000", "1만", "1만5천", "20000" 등 금액 표기를 정수(원)로 정규화한다.
_NUM_RE = re.compile(r"[\d,]+")
_MAN = 10_000  # 만
_CHEON = 1_000  # 천


def normalize_card(item: CardListItem, raw: dict) -> Card:
    """파서가 뽑은 원시 dict + 목록 아이템 → 검증 대상 Card 모델.

    - 연회비: 국내전용 금액을 대표값(annual_fee, 원)으로 사용.
    - 혜택: 요약/상세/연회비/브랜드를 구조화하여 benefits(jsonb) 로 저장.
    Pydantic 검증은 호출 측(main)에서 Card(...) 생성 시 수행된다.
    """
    fee = raw.get("annual_fee") or {}
    domestic = _extract_won(fee.get("domestic"))
    overseas = _extract_won(fee.get("overseas"))

    benefits = _build_benefits(raw, domestic, overseas)

    return Card(
        card_name=raw.get("card_name") or f"card-{item.card_gorilla_id}",
        issuer=raw.get("issuer"),
        benefits=benefits or None,
        # 국내전용이 없으면 해외겸용으로 폴백
        annual_fee=domestic if domestic is not None else overseas,
        img_url=raw.get("img_url"),
        source_url=item.detail_url,
    )


def _extract_won(text: str | None) -> int | None:
    if not text:
        return None

    # 한글 단위 표기: "1만5천", "2만"
    man = re.search(r"(\d+)\s*만", text)
    cheon = re.search(r"(\d+)\s*천", text)
    if man or cheon:
        total = 0
        if man:
            total += int(man.group(1)) * _MAN
        if cheon:
            total += int(cheon.group(1)) * _CHEON
        return total

    # 콤마/일반 숫자: "20,000", "20000"
    m = _NUM_RE.search(text)
    if m:
        digits = m.group(0).replace(",", "")
        if digits.isdigit():
            return int(digits)
    return None


def _build_benefits(raw: dict, domestic: int | None, overseas: int | None) -> dict:
    """추천 모듈이 매칭하기 쉬운 구조로 혜택을 정리한다.

    - summary: 대표 혜택 요약(.bnf1) [{title,value,note}]
    - details: 상세 혜택 블록(.benefit) [{title,desc}]
    - categories: 혜택 문구에서 감지한 소비 카테고리 태그 → 관련 문구
    - annual_fee: {domestic, overseas} (원)
    - network: 카드 브랜드(Visa/Mastercard 등)
    """
    summary = raw.get("benefit_summary") or []
    details = raw.get("benefit_details") or []

    benefits: dict = {}
    if summary:
        benefits["summary"] = summary
    if details:
        benefits["details"] = details

    categories = _tag_from_benefits(summary, details)
    if categories:
        benefits["categories"] = categories

    if domestic is not None or overseas is not None:
        benefits["annual_fee"] = {"domestic": domestic, "overseas": overseas}

    network = raw.get("card_network")
    if network:
        benefits["network"] = network

    return benefits


# 소비 카테고리 태깅용 키워드 사전.
# 태그 이름은 spend_categories.name(식비/카페/교통/쇼핑/의료/기타)과 1:1로 맞춘다.
# 기존 streaming/travel/communication 키워드는 대응하는 spend_category가 없어 "기타"로 흡수한다.
_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "카페": ("카페", "커피", "스타벅스", "coffee"),
    "식비": ("음식", "식당", "외식", "배달", "요기요", "배달의민족", "생활"),
    "교통": ("교통", "지하철", "버스", "대중교통", "택시", "주유", "주유소"),
    "쇼핑": ("쇼핑", "백화점", "마트", "온라인", "쿠팡", "편의점", "간편결제"),
    "의료": ("병원", "약국", "의료", "검진", "치과", "한의원"),
    "기타": (
        # streaming
        "넷플릭스", "유튜브", "스트리밍", "구독", "ott", "디지털구독",
        # travel
        "항공", "여행", "호텔", "면세", "공항",
        # communication
        "통신", "통신비", "휴대폰", "skt", "kt", "lg u+",
    ),
}


def _tag_from_benefits(summary: list[dict], details: list[dict]) -> dict[str, list[str]]:
    categories: dict[str, list[str]] = {}
    texts: list[str] = []
    for s in summary:
        texts.append(" ".join(str(v) for v in s.values() if v))
    for d in details:
        texts.append(" ".join(str(v) for v in d.values() if v))

    for text in texts:
        lower = text.lower()
        for tag, keywords in _CATEGORY_KEYWORDS.items():
            if any(kw.lower() in lower for kw in keywords):
                categories.setdefault(tag, []).append(text)
    return categories
