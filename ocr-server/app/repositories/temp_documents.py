from psycopg.rows import dict_row

from app.db import get_conn


def fetch_temp_document(temp_document_id: str) -> dict | None:
    """임시 문서 기본 정보를 조회한다. 존재하지 않으면 None.

    분석 소스는 temp_documents / temp_files 이며, 분석 후에도 보존된다(삭제 X).
    """
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT temp_document_id, user_id, ai_status
                FROM temp_documents
                WHERE temp_document_id = %s
                """,
                (temp_document_id,),
            )
            row = cur.fetchone()
    return dict(row) if row else None


def fetch_temp_files(temp_document_id: str) -> list[dict]:
    """임시 문서에 속한 이미지 파일을 페이지 순으로 조회한다."""
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT file_url, page_no
                FROM temp_files
                WHERE temp_document_id = %s
                ORDER BY page_no ASC
                """,
                (temp_document_id,),
            )
            rows = cur.fetchall()
    return [dict(r) for r in rows]


def mark_processing(temp_document_id: str) -> None:
    _update_status(temp_document_id, "PROCESSING")


def mark_done(temp_document_id: str) -> None:
    _update_status(temp_document_id, "DONE")


def mark_failed(temp_document_id: str) -> None:
    _update_status(temp_document_id, "FAILED")


def _update_status(temp_document_id: str, status: str) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE temp_documents SET ai_status = %s WHERE temp_document_id = %s",
                (status, temp_document_id),
            )
