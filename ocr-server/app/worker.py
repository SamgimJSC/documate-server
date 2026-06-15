import json
import logging
import signal

import redis

from app.config import settings
from app.db import init_pool, close_pool
from app import repositories as repo
from app.services import analyze

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ocr.worker")

_running = True


def _stop(*_args):
    global _running
    _running = False
    logger.info("shutdown signal received, finishing current job...")


def _redis_client() -> redis.Redis:
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD or None,
        db=settings.REDIS_DB,
        decode_responses=True,
        protocol=2,  # Redis < 6.0 은 RESP3 HELLO 미지원 (2 또는 3만 허용)
    )


def _handle(raw: str) -> None:
    """큐에서 꺼낸 페이로드 한 건을 처리한다."""
    document_id = None
    try:
        payload = json.loads(raw)
        document_id = payload.get("documentId")
        if not document_id:
            logger.warning("payload without documentId: %s", raw)
            return

        logger.info("processing document: %s", document_id)
        analyze(document_id)
    except Exception:
        logger.exception("analysis failed: %s", document_id)
        if document_id:
            try:
                repo.mark_failed(document_id)
            except Exception:
                logger.exception("failed to mark FAILED: %s", document_id)


def main() -> None:
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    init_pool()
    client = _redis_client()
    client.ping()
    logger.info("OCR worker started. consuming '%s'", settings.OCR_QUEUE_KEY)

    try:
        while _running:
            # BLPOP: API 서버의 RPUSH 와 짝을 이루는 FIFO 소비. 1초 타임아웃으로 종료 신호 확인.
            item = client.blpop(settings.OCR_QUEUE_KEY, timeout=1)
            if item is None:
                continue
            _, raw = item
            _handle(raw)
    finally:
        client.close()
        close_pool()
        logger.info("OCR worker stopped.")


if __name__ == "__main__":
    main()
