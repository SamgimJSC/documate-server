from __future__ import annotations

from app.db import get_conn


def fetch_category_names() -> dict[int, str]:
    """spend_categories 를 {spend_category_id: name} 으로 조회한다."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT spend_category_id, name FROM spend_categories")
            return {int(row[0]): row[1] for row in cur.fetchall()}
