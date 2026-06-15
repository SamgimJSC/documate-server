import psycopg2.extras

from app.db import get_conn
from .dates import parse_date


def fetch_document(document_id: str) -> dict | None:
    """문서 기본 정보를 조회한다. 존재하지 않으면 None."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT document_id, user_id, title, ai_status, is_deleted
                FROM documents
                WHERE document_id = %s
                """,
                (document_id,),
            )
            row = cur.fetchone()
    return dict(row) if row else None


def fetch_files(document_id: str) -> list[dict]:
    """문서에 속한 이미지 파일을 페이지 순으로 조회한다."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT file_url, page_no
                FROM document_files
                WHERE document_id = %s
                ORDER BY page_no ASC
                """,
                (document_id,),
            )
            rows = cur.fetchall()
    return [dict(r) for r in rows]


def mark_processing(document_id: str) -> None:
    _update_status(document_id, "PROCESSING")


def mark_failed(document_id: str) -> None:
    _update_status(document_id, "FAILED")


def _update_status(document_id: str, status: str) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE documents SET ai_status = %s WHERE document_id = %s",
                (status, document_id),
            )


def save_document_result(
    document_id: str,
    *,
    category_id: int | None,
    ocr_text: str,
    extracted_data: dict,
    ai_confidence: float | None,
    issue_date: str | None,
    expiry_date: str | None,
    renewal_date: str | None,
    page_count: int,
) -> None:
    """AI 분석 결과를 documents 에 저장하고 상태를 DONE 으로 변경한다."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET category_id = %s,
                    ocr_text = %s,
                    extracted_data = %s,
                    ai_confidence = %s,
                    issue_date = %s,
                    expiry_date = %s,
                    renewal_date = %s,
                    page_count = %s,
                    ai_status = 'DONE'
                WHERE document_id = %s
                """,
                (
                    category_id,
                    ocr_text,
                    psycopg2.extras.Json(extracted_data),
                    ai_confidence,
                    parse_date(issue_date),
                    parse_date(expiry_date),
                    parse_date(renewal_date),
                    page_count,
                    document_id,
                ),
            )


def add_activity(document_id: str, activity_type: str, description: str) -> None:
    """document_activities 에 활동 이력을 남긴다 (예: AI_ANALYZED)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO document_activities (document_id, activity_type, description)
                VALUES (%s, %s, %s)
                """,
                (document_id, activity_type, description),
            )
