import asyncio
import json
import logging
import signal
import uuid
from concurrent.futures import ThreadPoolExecutor

import redis.asyncio as aioredis

from app.config import settings
from app.db import init_pool, close_pool
from app.services import generate_recommendations

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("card.worker")

_stop = asyncio.Event()


def _request_stop(*_args) -> None:
    logger.info("shutdown signal received, finishing in-flight jobs...")
    try:
        loop = asyncio.get_running_loop()
        loop.call_soon_threadsafe(_stop.set)
    except RuntimeError:
        _stop.set()


def _handle(raw: str) -> None:
    """큐에서 꺼낸 페이로드 한 건을 처리한다. (스레드 풀에서 블로킹 실행)

    페이로드: {"userId": "<uuid>"} (API 서버가 RPUSH)
    DB 조회/저장(동기 psycopg)과 LLM 사유 생성이 이 스레드에서 수행된다.
    LLM 호출은 reason 생성기 내부 세마포어(LLM_CONCURRENCY)로 직렬화된다.
    """
    user_id = None
    try:
        payload = json.loads(raw)
        user_id = payload.get("userId") or payload.get("user_id")
        if not user_id:
            logger.warning("payload without userId: %s", raw)
            return
        if not _is_uuid(user_id):
            # 잘못된 형식의 userId(비-UUID)는 DB 에러를 내기 전에 걸러서 스킵한다.
            logger.warning("invalid userId (not a uuid), skipping: %s", user_id)
            return

        logger.info("recommending for user: %s", user_id)
        generate_recommendations(user_id)
    except Exception:
        logger.exception("recommendation failed: %s", user_id)


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


async def _consume() -> None:
    init_pool()

    client = aioredis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD or None,
        db=settings.REDIS_DB,
        decode_responses=True,
        protocol=2,
    )
    await client.ping()

    loop = asyncio.get_running_loop()
    # 추천 작업은 LLM 직렬화 때문에 굳이 많이 병렬화할 이유가 없다.
    pool = ThreadPoolExecutor(max_workers=max(1, settings.LLM_CONCURRENCY))
    slots = asyncio.Semaphore(max(1, settings.LLM_CONCURRENCY))

    logger.info(
        "Card worker started. queue='%s', llm_concurrency=%d",
        settings.CARD_QUEUE_KEY,
        settings.LLM_CONCURRENCY,
    )

    pending: set[asyncio.Future] = set()
    try:
        while not _stop.is_set():
            await slots.acquire()
            if _stop.is_set():
                slots.release()
                break

            # BLPOP: API 서버의 RPUSH 와 짝을 이루는 FIFO 소비. 1초 타임아웃으로 종료 확인.
            item = await client.blpop(settings.CARD_QUEUE_KEY, timeout=1)
            if item is None:
                slots.release()
                continue

            _, raw = item
            fut = loop.run_in_executor(pool, _handle, raw)

            def _done(f: asyncio.Future) -> None:
                slots.release()
                pending.discard(f)

            fut.add_done_callback(_done)
            pending.add(fut)
    finally:
        if pending:
            logger.info("waiting for %d in-flight job(s)...", len(pending))
            await asyncio.gather(*pending, return_exceptions=True)
        pool.shutdown(wait=True)
        await client.aclose()
        close_pool()
        logger.info("Card worker stopped.")


def main() -> None:
    signal.signal(signal.SIGINT, _request_stop)
    try:
        signal.signal(signal.SIGTERM, _request_stop)
    except (AttributeError, ValueError):
        pass

    try:
        asyncio.run(_consume())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
