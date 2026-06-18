from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException

from app.db import get_conn

router = APIRouter(prefix="/temp-documents", tags=["temp-documents"])


@router.get("/{temp_document_id}/status")
async def get_ai_status(temp_document_id: str):
    """폴링용 — 임시 문서의 AI 처리 상태를 반환한다.

    ai_status: PENDING | PROCESSING | DONE | FAILED
    (운영 클라이언트는 보통 NestJS API 서버의 폴링 엔드포인트를 사용한다.)
    """
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT temp_document_id, ai_status
                FROM temp_documents
                WHERE temp_document_id = %s
                """,
                (temp_document_id,),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="temp document not found")

    return {
        "tempDocumentId": str(row["temp_document_id"]),
        "aiStatus": row["ai_status"],
    }
