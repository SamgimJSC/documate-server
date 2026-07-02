"""카드 크롤링 배치 진입점.

    python crawl.py          # 전체 TOP100
    python crawl.py 5        # 상위 5개만 (개발/검증용)

목록 → 상세 병렬 크롤링 → 파싱/정규화 → 검증 → cards UPSERT 전체 경로를 실행한다.
"""

import asyncio
import logging
import sys

from app.config import settings
from app.crawler import run


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        settings.LIMIT = int(sys.argv[1])

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logging.getLogger(__name__).info("크롤링 시작 (LIMIT=%s)", settings.LIMIT or "전체")
    asyncio.run(run())


if __name__ == "__main__":
    main()
