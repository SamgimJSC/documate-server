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
    return _client
