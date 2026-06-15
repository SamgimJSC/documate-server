from datetime import date

import psycopg2.extras

from app.db import get_conn
from .dates import parse_date


def insert_receipt(
    *,
    user_id: str,
    spend_category_id: int | None,
    file_url: str | None,
    store_name: str | None,
    store_address: str | None,
    total_amount: float | None,
    purchase_date: str | None,
    payment_item: str | None,
    ocr_text: str,
    extracted_data: dict,
) -> str:
    """영수증으로 분류된 경우 receipts 행을 생성하고 receipt_id 를 반환한다.

    store_name / total_amount / purchase_date 는 NOT NULL 이므로 안전한 기본값을 채운다.
    """
    parsed_date = parse_date(purchase_date) or date.today().isoformat()

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO receipts (
                    user_id, spend_category_id, input_method, file_url,
                    store_name, store_address, total_amount, purchase_date,
                    payment_item, ocr_text, extracted_data, ai_status, is_confirmed
                )
                VALUES (
                    %s, %s, 'OCR', %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, 'DONE', false
                )
                RETURNING receipt_id
                """,
                (
                    user_id,
                    spend_category_id,
                    file_url,
                    store_name or "미상",
                    store_address,
                    total_amount if total_amount is not None else 0,
                    parsed_date,
                    payment_item,
                    ocr_text,
                    psycopg2.extras.Json(extracted_data),
                ),
            )
            receipt_id = cur.fetchone()[0]
    return str(receipt_id)
