"""로컬 개발용 진입점 — 소량(기본 5개)만 크롤링해 e2e 를 빠르게 확인한다.

    python dev.py           # 상위 5개
    python dev.py 10        # 상위 10개

LIMIT 을 강제로 덮어써서 실행한다. (목록→상세→파싱→검증→UPSERT 전체 경로)
"""
import logging
import sys

from app.config import settings
from app.main import run
import asyncio


def main() -> None:
    limit = 5
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        limit = int(sys.argv[1])

    # 런타임에 수집 개수를 제한한다.
    settings.LIMIT = limit
    # 개발 중에는 브라우저를 눈으로 보고 싶을 수 있으니 필요 시 아래 주석 해제.
    # settings.HEADLESS = False

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logging.getLogger(__name__).info("dev 크롤링 시작 (LIMIT=%d)", limit)
    asyncio.run(run())


if __name__ == "__main__":
    main()
