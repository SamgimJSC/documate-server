from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # OCR 작업 큐 (API 서버가 RPUSH, OCR 워커가 BLPOP)
    OCR_QUEUE_KEY: str = "ocr:queue"
    # PaddleOCR 인식 언어 (korean | en | ...)
    OCR_LANG: str = "korean"

    # Ollama (로컬 LLM)
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_TIMEOUT: int = 120

    # AWS S3 (업로드된 원본 이미지 조회)
    AWS_REGION: str = "ap-northeast-2"
    AWS_S3_BUCKET_NAME: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
