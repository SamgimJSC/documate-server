from __future__ import annotations

from psycopg.rows import dict_row
from psycopg.types.json import Json

from app.db import get_conn
from app.models import Card


def fetch_all_cards() -> list[dict]:
    """추천 매칭용으로 전체 카드를 조회한다.

    반환 각 항목: {card_id, card_name, issuer, annual_fee, img_url, benefits}
    """
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT card_id, card_name, issuer, annual_fee, img_url, benefits
                FROM cards
                """
            )
            return cur.fetchall()


# 기본 카드 3종 조회(/cards/check)는 NestJS API 서버가 담당한다.


# `cards` 테이블은 card_id(uuid) 를 자동생성 PK 로 쓰고 source_url 에는 UNIQUE 제약이
# 없다(엔티티 기준). DDL 은 API 서버 소관이라 여기서 제약을 추가할 수 없으므로,
# ON CONFLICT 대신 source_url 기준 SELECT → UPDATE / INSERT 수동 UPSERT 로 멱등성을 확보한다.
#
# (개선안: cards.source_url 에 UNIQUE 인덱스를 추가하면 단일 INSERT ... ON CONFLICT
#  로 단순화할 수 있음 — plan §10 오픈이슈 참고.)
#
# 동기 함수다. Playwright(asyncio) 파이프라인에서는 asyncio.to_thread 로 호출한다.


def upsert_card(card: Card) -> str:
    """source_url 기준으로 카드 행을 삽입 또는 갱신하고 card_id 를 반환한다.

    crawled_at 은 매 실행 시 now() 로 갱신한다.
    """
    benefits = Json(card.benefits) if card.benefits is not None else None

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT card_id FROM cards WHERE source_url = %s LIMIT 1",
                (card.source_url,),
            )
            row = cur.fetchone()

            if row is not None:
                card_id = row[0]
                cur.execute(
                    """
                    UPDATE cards
                    SET card_name = %s,
                        issuer = %s,
                        benefits = %s,
                        annual_fee = %s,
                        img_url = %s,
                        crawled_at = now()
                    WHERE card_id = %s
                    """,
                    (
                        card.card_name,
                        card.issuer,
                        benefits,
                        card.annual_fee,
                        card.img_url,
                        card_id,
                    ),
                )
                return str(card_id)

            cur.execute(
                """
                INSERT INTO cards (
                    card_name, issuer, benefits, annual_fee, img_url, source_url, crawled_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, now())
                RETURNING card_id
                """,
                (
                    card.card_name,
                    card.issuer,
                    benefits,
                    card.annual_fee,
                    card.img_url,
                    card.source_url,
                ),
            )
            inserted = cur.fetchone()
            return str(inserted[0])
