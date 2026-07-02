from __future__ import annotations

from dataclasses import dataclass

from app.db import get_conn

# 추천 결과 조회(/cards/recommendation)는 NestJS API 서버가 담당한다.
# 이 워커는 추천을 계산해 저장(교체)하는 쓰기만 수행한다.


@dataclass
class RecommendationRow:
    card_id: str
    reason: str | None
    match_score: float | None


def replace_recommendations(user_id: str, items: list[RecommendationRow]) -> int:
    """유저의 기존 추천을 모두 지우고 새 추천 목록으로 교체한다 (한 트랜잭션).

    반환값: 저장한 추천 개수.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM card_recommendations WHERE user_id = %s",
                (user_id,),
            )
            for it in items:
                cur.execute(
                    """
                    INSERT INTO card_recommendations
                        (user_id, card_id, reason, match_score, recommended_at)
                    VALUES (%s, %s, %s, %s, now())
                    """,
                    (user_id, it.card_id, it.reason, it.match_score),
                )
    return len(items)
