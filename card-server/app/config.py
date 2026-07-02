from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database (Supabase / PostgreSQL) ---
    # API 서버와 동일한 단일 연결 문자열을 사용한다.
    # 예) postgresql://USER:PASSWORD@HOST:PORT/DBNAME
    DB_URL: str
    # DB 커넥션 풀 최대 크기 (spec: 2)
    DB_POOL_SIZE: int = 2

    # --- Redis (추천 작업 큐) ---
    # API 서버가 RPUSH, card-server 워커가 BLPOP 하는 큐.
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    CARD_QUEUE_KEY: str = "card:queue"

    # --- Ollama (로컬 LLM, 추천 사유 문장 생성) ---
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:1b"
    OLLAMA_TIMEOUT: int = 60
    # 로컬 LLM 동시 호출 수 (OOM 방지, spec: 1)
    LLM_CONCURRENCY: int = 1
    # LLM 로 사유 문장을 생성할지 여부. False 면 규칙 기반 문장만 사용.
    USE_LLM_REASON: bool = True

    # --- 추천 로직 ---
    # 소비 분석 대상 최근 기간(일)
    RECENT_DAYS: int = 30
    # 추천 카드 개수
    RECOMMEND_TOP_N: int = 3
    # (기본 카드 3종 노출/receipt 존재 확인은 NestJS API 서버가 담당)

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
