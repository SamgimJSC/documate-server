from __future__ import annotations

import asyncio
import logging
import random
from typing import TYPE_CHECKING

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings
from app.models import CardListItem

if TYPE_CHECKING:
    from playwright.async_api import BrowserContext

log = logging.getLogger(__name__)


async def fetch_all_details(
    context: "BrowserContext", items: list[CardListItem]
) -> list[tuple[CardListItem, str | None]]:
    """상세페이지들을 동시성 제한(Semaphore) 하에 병렬 크롤링한다.

    각 카드에 대해 (목록아이템, HTML|None) 튜플을 반환한다.
    개별 실패는 None 으로 표기하고 배치는 계속 진행한다(부분 실패 허용, plan §7).
    """
    sem = asyncio.Semaphore(settings.CONCURRENCY)

    async def _one(item: CardListItem) -> tuple[CardListItem, str | None]:
        async with sem:
            # 요청 간 랜덤 지연으로 상대 서버 부하를 낮춘다.
            await asyncio.sleep(random.uniform(settings.DELAY_MIN, settings.DELAY_MAX))
            try:
                html = await fetch_detail_html(context, item.detail_url)
                return item, html
            except Exception as e:  # 재시도까지 실패
                log.warning("상세 크롤링 실패 [%s] %s: %s", item.card_gorilla_id, item.detail_url, e)
                return item, None

    return await asyncio.gather(*(_one(it) for it in items))


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(settings.MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
async def fetch_detail_html(context: "BrowserContext", url: str) -> str:
    """단일 상세페이지를 로드하고 렌더링된 HTML 을 반환한다. (tenacity 재시도)"""
    page = await context.new_page()
    try:
        # SPA 라 networkidle 대신 domcontentloaded 로 진입 후 셀렉터 대기.
        await page.goto(url, wait_until="domcontentloaded")
        # 카드 상세 헤더가 DOM 에 붙는 것만으로는 부족하다. Vue 가 노드를 먼저 붙이고
        # 내용(카드명)을 조금 뒤에 채우기 때문에, strong.card 텍스트가 실제로 채워질
        # 때까지 기다린 뒤 HTML 을 긁어야 카드명 누락을 막을 수 있다.
        await page.wait_for_selector(
            ".card_top .tit strong.card", state="attached", timeout=settings.PAGE_TIMEOUT_MS
        )
        await page.wait_for_function(
            "() => { const e = document.querySelector('.card_top .tit strong.card');"
            " return e && e.textContent.trim().length > 0; }",
            timeout=settings.PAGE_TIMEOUT_MS,
        )
        return await page.content()
    finally:
        await page.close()
