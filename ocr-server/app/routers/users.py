import json
import psycopg2.extras
from fastapi import APIRouter

from app.db import get_conn
from app.redis import get_redis

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM users")
            users = [dict(row) for row in cur.fetchall()]

    redis = get_redis()

    await redis.set(f"userList", json.dumps(users, default=str), ex=10)

    print(users)
    return users
