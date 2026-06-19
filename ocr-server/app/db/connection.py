from contextlib import contextmanager

from psycopg_pool import ConnectionPool

from app.config import settings

_pool: ConnectionPool | None = None


def init_pool() -> None:
    """프로세스당 하나의 스레드 안전 커넥션 풀(psycopg3)을 만든다.

    OCR 워커는 OCR_WORKER_COUNT 개의 스레드에서 동시에 DB 를 쓰므로
    풀 최대 크기를 DB_POOL_SIZE 로 제한한다 (spec).
    """
    global _pool
    _pool = ConnectionPool(
        conninfo=settings.DB_URL,
        # Supabase 풀러(pgbouncer, transaction mode)에서는 prepared statement 가
        # 충돌하므로 비활성화한다.
        kwargs={"prepare_threshold": None},
        min_size=1,
        max_size=settings.DB_POOL_SIZE,
        open=True,
    )


def close_pool() -> None:
    if _pool:
        _pool.close()


@contextmanager
def get_conn():
    """풀에서 커넥션을 빌려준다. 정상 종료 시 commit / 예외 시 rollback 후 반납."""
    if _pool is None:
        raise RuntimeError("DB pool not initialized. call init_pool() first.")
    with _pool.connection() as conn:
        yield conn
