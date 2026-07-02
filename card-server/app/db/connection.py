from contextlib import contextmanager

from psycopg_pool import ConnectionPool

from app.config import settings

# 크롤러는 Playwright 때문에 Windows 에서 ProactorEventLoop 를 써야 하는데,
# psycopg 의 async 풀은 SelectorEventLoop 를 요구해 상호 충돌한다.
# 따라서 DB 는 동기 psycopg 풀(ocr-server 와 동일)을 쓰고, 호출 측에서
# asyncio.to_thread 로 감싸 이벤트 루프를 막지 않도록 한다.
_pool: ConnectionPool | None = None


def init_pool() -> None:
    """프로세스당 하나의 스레드 안전 동기 커넥션 풀을 연다."""
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
    if _pool is not None:
        _pool.close()


@contextmanager
def get_conn():
    """풀에서 커넥션을 빌려준다. 정상 종료 시 commit / 예외 시 rollback 후 반납."""
    if _pool is None:
        raise RuntimeError("DB pool not initialized. call init_pool() first.")
    with _pool.connection() as conn:
        yield conn
