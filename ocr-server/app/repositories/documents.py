from psycopg.types.json import Json

from app.db import get_conn
from .dates import parse_date


def insert_document(
    *,
    user_id: str,
    category_id: int | None,
    title: str | None,
    file_type: str | None,
    page_count: int,
    ocr_text: str,
    extracted_data: dict,
    ai_confidence: float | None,
    issue_date: str | None,
    expiry_date: str | None,
    renewal_date: str | None,
    files: list[dict],
) -> str:
    """분석 결과로 documents 행과 document_files 행들을 한 트랜잭션으로 생성하고
    document_id 를 반환한다.

    ai_status 는 DONE 으로 마감한다. (temp_documents 는 별도로 보존/갱신)
    files 는 temp_files 에서 조회한 {file_url, page_no} 목록으로,
    document_files 로 복사된다.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO documents (
                    user_id, category_id, title, file_type, page_count,
                    ocr_text, extracted_data, ai_confidence,
                    issue_date, expiry_date, renewal_date,
                    ai_status, is_confirmed
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    'DONE', false
                )
                RETURNING document_id
                """,
                (
                    user_id,
                    category_id,
                    title or "",
                    file_type,
                    page_count,
                    ocr_text,
                    Json(extracted_data),
                    ai_confidence,
                    parse_date(issue_date),
                    parse_date(expiry_date),
                    parse_date(renewal_date),
                ),
            )
            document_id = cur.fetchone()[0]

            if files:
                cur.executemany(
                    """
                    INSERT INTO document_files (document_id, file_url, page_no)
                    VALUES (%s, %s, %s)
                    """,
                    [(document_id, f["file_url"], f["page_no"]) for f in files],
                )
    return str(document_id)


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
