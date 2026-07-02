from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

from bs4 import BeautifulSoup

from app.config import settings
from app.models import CardListItem

if TYPE_CHECKING:
    from playwright.async_api import BrowserContext

log = logging.getLogger(__name__)

# 카드고릴라 TOP100 리스트는 SPA(Vue) 로, 각 카드 링크가 href="javascript:;" 라서
# href 로는 카드 ID 를 알 수 없다. 대신 카드 이미지 파일명이 항상 카드 ID 숫자로
# 시작하므로(라이브 CDN: .../img/{id}/{id}card_1.png, 저장본: {id}card_1.png /
# {id}.png 등) 파일명 basename 의 선행 숫자를 카드 ID 로 사용한다.
_BASENAME_ID_RE = re.compile(r"(\d+)")


async def collect_card_list(context: "BrowserContext") -> list[CardListItem]:
    """TOP100 목록 페이지를 로드하여 각 카드의 ID/순위 + 상세 URL 을 수집한다.

    SPA 라서 목록(.rk_lst)이 채워질 때까지 기다린 뒤, lazy-load 를 위해
    페이지 끝까지 스크롤하고, 렌더된 HTML 을 BeautifulSoup 으로 파싱한다.
    """
    page = await context.new_page()
    try:
        # 카드고릴라는 SPA 라 networkidle 이 잘 안 끝난다(라이브 랭킹/분석 트래픽).
        # domcontentloaded 로 진입한 뒤 핵심 셀렉터를 기다린다.
        await page.goto(settings.LIST_URL, wait_until="domcontentloaded")
        # 랭킹 리스트 아이템이 DOM 에 붙을 때까지 대기.
        # (첫 매칭이 숨은 Vue 템플릿일 수 있어 state="visible" 대신 "attached" 사용)
        await page.wait_for_selector(
            ".rk_lst li .card_img img", state="attached", timeout=settings.PAGE_TIMEOUT_MS
        )
        await _scroll_to_bottom(page)
        html = await page.content()
    finally:
        await page.close()

    items = _parse_list(html)

    if settings.LIMIT and settings.LIMIT > 0:
        items = items[: settings.LIMIT]

    log.info("목록 수집 완료: %d개 카드", len(items))
    return items


def _parse_list(html: str) -> list[CardListItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[CardListItem] = []
    seen: set[str] = set()

    # .rk_lst 는 카드마다 하나씩(빈 li 가 사이사이 끼어 있으므로 이미지 있는 li 만 취한다)
    for li in soup.select(".rk_lst li"):
        img = li.select_one(".card_img img")
        if img is None:
            continue
        card_id = _extract_card_id(img.get("src") or img.get("data-src") or "")
        if not card_id or card_id in seen:
            continue
        seen.add(card_id)

        rank = _parse_rank(li)
        items.append(
            CardListItem(
                card_gorilla_id=card_id,
                detail_url=settings.DETAIL_URL_TEMPLATE.format(card_id=card_id),
                rank=rank if rank is not None else len(items) + 1,
            )
        )
    return items


def _extract_card_id(src: str) -> str | None:
    # 쿼리스트링 제거 후 파일명(basename)만 취해 선행 숫자를 카드 ID 로 쓴다.
    basename = src.split("?")[0].rstrip("/").rsplit("/", 1)[-1]
    m = _BASENAME_ID_RE.match(basename)
    return m.group(1) if m else None


def _parse_rank(li) -> int | None:
    num = li.select_one(".num")
    if num:
        text = num.get_text(strip=True)
        if text.isdigit():
            return int(text)
    return None


async def _scroll_to_bottom(page, *, max_rounds: int = 40, pause_ms: int = 400) -> None:
    """lazy-load 목록을 끝까지 채우기 위해 높이가 안정될 때까지 스크롤한다."""
    prev_height = -1
    for _ in range(max_rounds):
        height = await page.evaluate("document.body.scrollHeight")
        if height == prev_height:
            break
        prev_height = height
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(pause_ms)
