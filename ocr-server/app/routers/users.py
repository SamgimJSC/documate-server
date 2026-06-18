import json

from psycopg.rows import dict_row
from fastapi import APIRouter

from app.db import get_conn
from app.redis import get_redis

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users():
    """간단한 연결 점검용 — users 목록을 조회하고 Redis 에 잠시 캐시한다."""
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users")
            users = [dict(row) for row in cur.fetchall()]

    redis = get_redis()
    await redis.set("userList", json.dumps(users, default=str), ex=10)

    return users
