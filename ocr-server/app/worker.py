import asyncio
import json
import logging
import signal
from concurrent.futures import ThreadPoolExecutor

import redis.asyncio as aioredis

from app.config import settings
from app.db import init_pool, close_pool
from app import repositories as repo
from app.services import analyze

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ocr.worker")

_stop = asyncio.Event()


def _request_stop(*_args) -> None:
    logger.info("shutdown signal received, finishing in-flight jobs...")
    # 시그널 핸들러는 다른 스레드일 수 있으므로 thread-safe 하게 set.
    try:
        loop = asyncio.get_running_loop()
        loop.call_soon_threadsafe(_stop.set)
    except RuntimeError:
        _stop.set()


def _handle(raw: str) -> None:
    """큐에서 꺼낸 페이로드 한 건을 처리한다. (스레드 풀에서 블로킹 실행)

    페이로드: {"tempDocumentId": "<uuid>"} (API 서버가 RPUSH)
    OCR(CPU 바운드)은 ThreadPoolExecutor 로 병렬화되고,
    LLM 호출은 classifier 내부 세마포어(LLM_CONCURRENCY)로 직렬화된다.
    """
    temp_document_id = None
    try:
        payload = json.loads(raw)
        temp_document_id = payload.get("tempDocumentId") or payload.get("documentId")
        if not temp_document_id:
            logger.warning("payload without tempDocumentId: %s", raw)
            return

        logger.info("processing temp document: %s", temp_document_id)
        analyze(temp_document_id)
    except Exception:
        logger.exception("analysis failed: %s", temp_document_id)
        if temp_document_id:
            try:
                repo.mark_failed(temp_document_id)
            except Exception:
                logger.exception("failed to mark FAILED: %s", temp_document_id)


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
    pool = ThreadPoolExecutor(max_workers=settings.OCR_WORKER_COUNT)
    # 동시에 처리 중인 문서 수를 풀 크기로 제한 (backpressure)
    slots = asyncio.Semaphore(settings.OCR_WORKER_COUNT)

    logger.info(
        "OCR worker started. queue='%s', ocr_workers=%d, llm_concurrency=%d",
        settings.OCR_QUEUE_KEY,
        settings.OCR_WORKER_COUNT,
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
            item = await client.blpop(settings.OCR_QUEUE_KEY, timeout=1)
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
        logger.info("OCR worker stopped.")


def main() -> None:
    signal.signal(signal.SIGINT, _request_stop)
    try:
        signal.signal(signal.SIGTERM, _request_stop)
    except (AttributeError, ValueError):
        # 일부 플랫폼/스레드에서는 SIGTERM 등록이 불가능할 수 있다.
        pass

    try:
        asyncio.run(_consume())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
