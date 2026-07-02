import json

import redis.asyncio as aioredis

from app.config import settings

_client: aioredis.Redis | None = None


async def init_redis() -> None:
    global _client
    _client = aioredis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD or None,
        db=settings.REDIS_DB,
        decode_responses=True,
        protocol=2,  # Redis < 6.0 은 RESP3 HELLO 미지원
    )
    await _client.ping()


async def close_redis() -> None:
    if _client:
        await _client.aclose()


def get_redis() -> aioredis.Redis:
    if _client is None:
        raise RuntimeError("Redis not initialized. call init_redis() first.")
    return _client


async def enqueue_card_job(user_id: str) -> None:
    """카드 추천 작업을 큐에 넣는다. 워커가 BLPOP 으로 소비한다.

    페이로드: {"userId": "<uuid>"}
    """
    payload = json.dumps({"userId": user_id})
    await get_redis().rpush(settings.CARD_QUEUE_KEY, payload)
