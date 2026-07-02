from __future__ import annotations

from playwright.async_api import Browser, BrowserContext, async_playwright

from app.config import settings


class BrowserSession:
    """Playwright 브라우저/컨텍스트의 생명주기를 관리하는 async 컨텍스트 매니저.

    사용:
        async with BrowserSession() as ctx:
            page = await ctx.new_page()
            ...
    하나의 컨텍스트를 공유하고, 상세 크롤링은 컨텍스트에서 page 를 여러 개
    열어(new_page) 동시성 제어(Semaphore)로 병렬 처리한다.
    """

    def __init__(self) -> None:
        self._pw = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    async def __aenter__(self) -> BrowserContext:
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(headless=settings.HEADLESS)
        self._context = await self._browser.new_context(
            user_agent=settings.USER_AGENT,
            viewport={"width": 1366, "height": 900},
        )
        self._context.set_default_timeout(settings.PAGE_TIMEOUT_MS)
        return self._context

    async def __aexit__(self, *exc) -> None:
        if self._context is not None:
            await self._context.close()
        if self._browser is not None:
            await self._browser.close()
        if self._pw is not None:
            await self._pw.stop()
