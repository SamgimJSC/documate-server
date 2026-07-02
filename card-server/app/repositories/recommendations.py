from __future__ import annotations

from dataclasses import dataclass

from psycopg.rows import dict_row

from app.db import get_conn


@dataclass
class RecommendationRow:
    card_id: str
    reason: str | None
    match_score: float | None


def fetch_recommendations(user_id: str) -> list[dict]:
    """유저의 기존 추천 결과를 카드 정보와 조인해 조회한다 (점수 높은 순)."""
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    r.recommendation_id,
                    r.card_id,
                    r.reason,
                    r.match_score,
                    r.recommended_at,
                    c.card_name,
                    c.issuer,
                    c.annual_fee,
                    c.img_url
                FROM card_recommendations r
                JOIN cards c ON c.card_id = r.card_id
                WHERE r.user_id = %s
                ORDER BY r.match_score DESC NULLS LAST, r.recommended_at DESC
                """,
                (user_id,),
            )
            return cur.fetchall()


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
