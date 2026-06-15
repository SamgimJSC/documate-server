import psycopg2.extras
from fastapi import APIRouter, HTTPException

from app.db import get_conn

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/{document_id}/status")
async def get_ai_status(document_id: str):
    """클라이언트 폴링용 — 문서의 AI 처리 상태를 반환한다."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT document_id, ai_status, ai_confidence, category_id
                FROM documents
                WHERE document_id = %s
                """,
                (document_id,),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="document not found")

    return {
        "documentId": str(row["document_id"]),
        "aiStatus": row["ai_status"],
        "aiConfidence": row["ai_confidence"],
        "categoryId": row["category_id"],
    }
