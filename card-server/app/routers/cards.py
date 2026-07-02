from __future__ import annotations

from fastapi import APIRouter, Query

from app.config import settings
from app.redis import enqueue_card_job
from app.repositories import (
    fetch_cards_by_names,
    fetch_recommendations,
    has_any_receipt,
)

router = APIRouter(prefix="/cards", tags=["cards"])


def _card_json(row: dict) -> dict:
    return {
        "cardId": str(row["card_id"]),
        "cardName": row.get("card_name"),
        "issuer": row.get("issuer"),
        "annualFee": _int(row.get("annual_fee")),
        "imgUrl": row.get("img_url"),
    }


def _recommendation_json(row: dict) -> dict:
    return {
        "recommendationId": str(row["recommendation_id"]),
        "cardId": str(row["card_id"]),
        "cardName": row.get("card_name"),
        "issuer": row.get("issuer"),
        "annualFee": _int(row.get("annual_fee")),
        "imgUrl": row.get("img_url"),
        "reason": row.get("reason"),
        "matchScore": _float(row.get("match_score")),
        "recommendedAt": (
            row["recommended_at"].isoformat() if row.get("recommended_at") else None
        ),
    }


@router.get("/recommendation")
def get_recommendation(userId: str = Query(..., description="회원 UUID")):
    """기존에 추천받은 카드 목록을 반환한다. 없으면 빈 배열.

    (동기 핸들러 — FastAPI 가 스레드풀에서 실행하므로 이벤트 루프를 막지 않는다)
    """
    rows = fetch_recommendations(userId)
    return {"userId": userId, "recommendations": [_recommendation_json(r) for r in rows]}


@router.get("/check")
def check(userId: str = Query(..., description="회원 UUID")):
    """유저에게 receipt 가 있는지 확인한다.

    - 있으면: {hasReceipt: true} → 클라이언트는 'AI 추천받기' 버튼 노출
    - 없으면: {hasReceipt: false, defaultCards: [...]} → 기본 카드 3종 노출
    """
    if has_any_receipt(userId):
        return {"userId": userId, "hasReceipt": True, "defaultCards": []}

    cards = fetch_cards_by_names(settings.DEFAULT_CARD_NAMES)
    return {
        "userId": userId,
        "hasReceipt": False,
        "defaultCards": [_card_json(c) for c in cards],
    }


@router.get("/ai")
async def request_ai(userId: str = Query(..., description="회원 UUID")):
    """AI 카드 추천 작업을 큐에 넣는다 (card:queue). 워커가 비동기로 처리한다."""
    await enqueue_card_job(userId)
    return {"userId": userId, "status": "queued", "queue": settings.CARD_QUEUE_KEY}


def _int(v):
    return int(v) if v is not None else None


def _float(v):
    return float(v) if v is not None else None
