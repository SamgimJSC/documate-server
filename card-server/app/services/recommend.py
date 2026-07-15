from __future__ import annotations

import logging

from app.config import settings
from app.llm import build_reason
from app.repositories import (
    RecommendationRow,
    fetch_all_cards,
    fetch_category_names,
    replace_recommendations,
    sum_amount_by_category,
)

log = logging.getLogger(__name__)

# spend_categories.name 이 곧 카드 benefits.categories 의 태그 이름이다.
# (크롤러 normalizer 의 _CATEGORY_KEYWORDS 가 동일한 한글 이름으로 태깅함)


def generate_recommendations(user_id: str) -> dict:
    """유저의 최근 소비패턴을 분석해 카드 3개를 추천하고 DB 에 저장한다. (동기)

    매칭 우선순위(spec):
      1. benefits 가 유저의 카테고리별 소비금액이 큰 spend_category 와 연관성이 높음
      2. 연회비가 낮은순
    """
    totals = sum_amount_by_category(user_id, settings.RECENT_DAYS)
    category_names = fetch_category_names()
    cards = fetch_all_cards()

    if not cards:
        log.warning("cards 테이블이 비어 있어 추천을 만들 수 없습니다. (크롤링 필요)")
        replace_recommendations(user_id, [])
        return {"user_id": user_id, "saved": 0, "reason": "no_cards"}

    # 카테고리(spend_categories.name)별 소비 가중치(금액)를 만든다.
    weight_by_tag: dict[str, int] = {}
    for cid, amount in totals.items():
        name = category_names.get(cid)
        if name:
            weight_by_tag[name] = weight_by_tag.get(name, 0) + amount

    total_spend = sum(weight_by_tag.values())

    scored = [_score_card(c, weight_by_tag, total_spend) for c in cards]
    # 1순위 점수 내림차순, 2순위 연회비 오름차순(None 은 뒤로)
    scored.sort(key=lambda s: (-s["score"], _fee_key(s["annual_fee"])))
    top = scored[: settings.RECOMMEND_TOP_N]

    rows: list[RecommendationRow] = []
    for s in top:
        reason = build_reason(
            card_name=s["card_name"],
            matched_category_names=s["matched_category_names"],
            annual_fee=s["annual_fee"],
        )
        rows.append(
            RecommendationRow(
                card_id=str(s["card_id"]),
                reason=reason,
                match_score=round(s["score"] * 100, 2),
            )
        )

    saved = replace_recommendations(user_id, rows)
    log.info(
        "추천 저장 완료 user=%s saved=%d top=%s",
        user_id,
        saved,
        [s["card_name"] for s in top],
    )
    return {
        "user_id": user_id,
        "saved": saved,
        "top": [
            {"card_name": s["card_name"], "match_score": round(s["score"] * 100, 2)}
            for s in top
        ],
    }


def _score_card(
    card: dict,
    weight_by_tag: dict[str, int],
    total_spend: int,
) -> dict:
    benefits = card.get("benefits") or {}
    card_tags = set((benefits.get("categories") or {}).keys())
    matched_tags = card_tags & weight_by_tag.keys()

    if total_spend > 0:
        score = sum(weight_by_tag[t] for t in matched_tags) / total_spend
    else:
        score = 0.0

    # 매칭된 카테고리(이미 한글명)를 소비금액 큰 순으로 정렬해 사유 문장에 사용.
    matched_kor = sorted(matched_tags, key=lambda t: weight_by_tag[t], reverse=True)

    return {
        "card_id": card["card_id"],
        "card_name": card["card_name"],
        "annual_fee": _to_int(card.get("annual_fee")),
        "score": score,
        "matched_category_names": matched_kor,
    }


def _fee_key(annual_fee: int | None) -> int:
    # 연회비가 없으면 정렬상 가장 뒤로.
    return annual_fee if annual_fee is not None else 10**12


def _to_int(v) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None
