from __future__ import annotations

import asyncio
import logging

from pydantic import ValidationError

from app.crawler import BrowserSession, collect_card_list, fetch_all_details
from app.db import close_pool, init_pool
from app.models import Card, CardListItem
from app.normalizer import normalize_card
from app.parser import parse_detail
from app.repositories import upsert_card

log = logging.getLogger(__name__)


async def run() -> dict:
    """전체 크롤링 파이프라인을 실행하고 요약 통계를 반환한다.

    목록 수집 → 상세 병렬 크롤링 → 파싱/정규화 → Pydantic 검증 → DB UPSERT.
    """
    stats = {"total": 0, "saved": 0, "skipped": 0, "failed_crawl": 0}

    init_pool()
    try:
        async with BrowserSession() as context:
            # 1) 목록 수집 (실패 시 배치 전체 중단, plan §7-1)
            items = await collect_card_list(context)
            stats["total"] = len(items)
            if not items:
                log.error("목록에서 수집된 카드가 없습니다. 셀렉터/렌더링을 확인하세요.")
                return stats

            # 2) 상세 병렬 크롤링
            results = await fetch_all_details(context, items)

        # 3~5) 파싱 → 정규화 → 검증 → UPSERT (카드 단위 부분 실패 허용)
        for item, html in results:
            if html is None:
                stats["failed_crawl"] += 1
                continue
            try:
                card = _to_card(item, html)
            except ValidationError as e:
                log.warning("검증 실패, 스킵 [%s]: %s", item.card_gorilla_id, e)
                stats["skipped"] += 1
                continue

            try:
                # DB 는 동기 psycopg 풀이므로 스레드로 넘겨 이벤트 루프를 막지 않는다.
                card_id = await asyncio.to_thread(upsert_card, card)
                stats["saved"] += 1
                log.info("저장 완료 [rank=%s] %s → %s", item.rank, card.card_name, card_id)
            except Exception as e:  # DB 오류 → 해당 카드 스킵
                log.warning("DB UPSERT 실패, 스킵 [%s]: %s", item.card_gorilla_id, e)
                stats["skipped"] += 1
    finally:
        close_pool()

    log.info(
        "크롤링 종료 — 총 %(total)d / 저장 %(saved)d / 스킵 %(skipped)d / 크롤실패 %(failed_crawl)d",
        stats,
    )
    return stats


def _to_card(item: CardListItem, html: str) -> Card:
    raw = parse_detail(html)
    return normalize_card(item, raw)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(run())


if __name__ == "__main__":
    main()
