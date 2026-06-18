from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database (Supabase / PostgreSQL) ---
    # API 서버와 동일하게 단일 연결 문자열을 사용한다.
    # 예) postgresql://USER:PASSWORD@HOST:PORT/DBNAME
    DB_URL: str

    # --- Redis ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # OCR 작업 큐 (API 서버가 RPUSH, OCR 워커가 BLPOP)
    OCR_QUEUE_KEY: str = "ocr:queue"

    # --- PaddleOCR ---
    # 인식 언어 (korean | en | ...)
    OCR_LANG: str = "korean"

    # --- Ollama (로컬 LLM) ---
    OLLAMA_HOST: str = "http://localhost:11434"
    # 4GB 환경: gemma3:1b / 8GB 환경: gemma3:4b
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_TIMEOUT: int = 120

    # --- AWS S3 (업로드된 원본 이미지 조회) ---
    AWS_REGION: str = "ap-northeast-2"
    AWS_S3_BUCKET_NAME: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # --- 병렬처리 / 자원제한 (spec) ---
    # 동시에 처리할 문서 수 = OCR 스레드 풀 크기
    OCR_WORKER_COUNT: int = 2
    # 로컬 LLM 동시 호출 수 (OOM 방지를 위해 1로 직렬화)
    LLM_CONCURRENCY: int = 1
    # DB 커넥션 풀 최대 크기 (프로세스당)
    DB_POOL_SIZE: int = 2

    # --- 분석 판정 기준 (spec) ---
    # OCR+LLM 평균 신뢰도가 이 값 미만이면 FAILED 로 판정
    AI_CONFIDENCE_THRESHOLD: float = 70.0
    # LLM JSON 포매팅 + Pydantic 검증 최대 재시도 횟수
    LLM_FORMAT_MAX_RETRIES: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
