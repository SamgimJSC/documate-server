from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database (Supabase / PostgreSQL) ---
    # API 서버와 동일한 단일 연결 문자열을 사용한다.
    # 예) postgresql://USER:PASSWORD@HOST:PORT/DBNAME
    DB_URL: str
    # DB 커넥션 풀 최대 크기
    DB_POOL_SIZE: int = 5

    # --- 크롤링 대상 ---
    LIST_URL: str = "https://www.card-gorilla.com/chart/top100"
    # 상세페이지 URL 템플릿. list_page 가 절대 URL 을 못 구했을 때 card_id 로 조립한다.
    DETAIL_URL_TEMPLATE: str = "https://www.card-gorilla.com/card/detail/{card_id}"

    # --- 동시성 / 부하 제어 (plan §6) ---
    # 상세페이지 동시 크롤링 수 (10~20 권장)
    CONCURRENCY: int = 15
    # 요청 간 랜덤 지연 (초)
    DELAY_MIN: float = 0.5
    DELAY_MAX: float = 1.5
    # 페이지 로드 타임아웃 (ms)
    PAGE_TIMEOUT_MS: int = 30_000
    # 상세 크롤링 재시도 최대 횟수 (tenacity)
    MAX_RETRIES: int = 3

    # --- 수집 개수 제한 (0 = 제한 없음, 전체 TOP100) ---
    LIMIT: int = 0

    # --- 브라우저 ---
    HEADLESS: bool = True
    USER_AGENT: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
