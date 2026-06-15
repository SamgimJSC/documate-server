import psycopg2.extras

from app.db import get_conn


def resolve_document_category_id(code: str | None) -> int | None:
    """document_categories.code 로 category_id 를 조회한다. 없으면 None."""
    if not code:
        return None
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT category_id FROM document_categories WHERE code = %s",
                (code,),
            )
            row = cur.fetchone()
    return row[0] if row else None


def resolve_spend_category_id(name: str | None) -> int | None:
    """spend_categories.name 으로 spend_category_id 를 조회한다. 없으면 None."""
    if not name:
        return None
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT spend_category_id FROM spend_categories WHERE name = %s",
                (name,),
            )
            row = cur.fetchone()
    return row[0] if row else None
