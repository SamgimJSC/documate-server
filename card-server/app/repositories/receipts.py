from __future__ import annotations

from app.db import get_conn

# receipts 는 조회만 한다 (스키마/데이터 수정 없음).
# receipt 존재 여부 확인(/cards/check)은 NestJS API 서버가 담당한다.


def sum_amount_by_category(user_id: str, since_days: int) -> dict[int, int]:
    """최근 N일간 유저의 receipt 를 spend_category 별로 합산해 {카테고리ID: 총액} 반환.

    spend_category_id 가 NULL 인 영수증은 집계에서 제외한다.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT spend_category_id, COALESCE(SUM(total_amount), 0) AS total
                FROM receipts
                WHERE user_id = %s
                  AND is_deleted = false
                  AND spend_category_id IS NOT NULL
                  AND purchase_date >= (CURRENT_DATE - %s::int)
                GROUP BY spend_category_id
                ORDER BY total DESC
                """,
                (user_id, since_days),
            )
            return {int(row[0]): int(row[1]) for row in cur.fetchall()}
