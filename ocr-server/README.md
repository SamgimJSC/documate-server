# DocuMate OCR Server

업로드된 문서/영수증 이미지를 **OCR + 로컬 LLM** 으로 분석하는 Python 워커 서버.

## 서비스 플로우

1. 클라이언트 → S3 직접 업로드
2. 클라이언트 → API 서버(NestJS) 로 분석 요청
3. API 서버 → Redis 큐 `ocr:queue` 에 `RPUSH {"tempDocumentId": "<uuid>"}`
4. **OCR 워커** → `BLPOP` 으로 POP
5. 분석 작업
   1. `temp_files` 의 S3 키로 이미지 다운로드
   2. PaddleOCR 로 텍스트 추출 + 평균 신뢰도 계산
   3. Ollama 로컬 LLM 으로 `RECEIPT` / `DOCUMENT` 대분류 + 세부분류 + 핵심정보 추출 (confidence 평가)
   4. `ai_confidence = (OCR 평균 + LLM confidence) / 2` → **70 미만이면 `FAILED`**
   5. Pydantic 으로 DB 스키마 검증 (실패 시 LLM 포매팅 **최대 5회** 재시도, 모두 실패하면 `FAILED`)
   6. 결과를 DB 에 **새 행으로 저장** (`documents` 또는 `receipts` INSERT) → `temp_documents.ai_status = DONE`
6. 클라이언트 → 3~5초 주기로 상태 폴링

> 분석 소스는 `temp_documents` / `temp_files` 이며, 분석 후에도 **보존**된다(삭제 X).
> DB 마이그레이션은 NestJS API 서버가 담당한다. 이 워커는 **조회/삽입/수정만** 하며 스키마(DDL)는 건드리지 않는다.

## 구성

```
app/
  config.py              # 환경설정 (DB/Redis/Ollama/S3 + 동시성/판정 기준)
  db/connection.py       # psycopg2 커넥션 풀 (DB_POOL_SIZE)
  redis/connection.py    # async redis (FastAPI 측)
  s3/client.py           # S3 객체 다운로드 (boto3)
  ocr/engine.py          # PaddleOCR 래퍼 → (텍스트, 평균 신뢰도)
  llm/classifier.py      # Ollama 분류/추출 + LLM 동시성 세마포어
  models/                # Pydantic 검증 모델 (document / receipt)
  repositories/          # temp_documents / documents / receipts / categories raw SQL
  services/analysis.py   # 단건 분석 오케스트레이션 (confidence/검증/저장)
  routers/documents.py   # GET /temp-documents/{id}/status (폴링용)
  worker.py              # Redis 큐 소비 워커 (asyncio + ThreadPoolExecutor)
main.py                  # FastAPI 실행 (상태 조회 API)
dev.py                   # API + 워커 동시 실행 (개발용)
```

### 병렬처리 / 자원제한 (t3.medium + swap 4GB 기준)

| 구간 | 메커니즘 | 설정값 |
|------|----------|--------|
| OCR (CPU 바운드) | `ThreadPoolExecutor` | `OCR_WORKER_COUNT=2` |
| LLM (메모리 바운드) | `threading.Semaphore` | `LLM_CONCURRENCY=1` |
| DB | psycopg2 풀 | `DB_POOL_SIZE=2` |

## 사전 준비

- PostgreSQL(Supabase), Redis 기동 — API 서버와 동일 인스턴스
- [Ollama](https://ollama.com) 설치 후 모델 pull:
  ```
  ollama pull gemma3:4b   # 8GB 환경 / 4GB(t3.medium) 환경은 gemma3:1b
  ```
  > 4GB 환경이면 `.env` 의 `OLLAMA_MODEL=gemma3:1b` 로 바꾼다.

## 설치

```bash
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

> `paddlepaddle` 은 용량이 크다. GPU 환경이면 `paddlepaddle-gpu` 로 교체.

## 환경설정

`.env.example` 를 복사해 `.env` 를 만들고 값을 채운다.

```bash
cp .env.example .env
```

| 키 | 설명 |
|----|------|
| `DB_URL` | PostgreSQL(Supabase) 연결 문자열 (API 서버와 동일) |
| `REDIS_*`, `OCR_QUEUE_KEY` | Redis 접속 + 작업 큐 키 (API 서버와 동일하게) |
| `AWS_*` | S3 원본 이미지 접근 키/버킷 |
| `OLLAMA_HOST`, `OLLAMA_MODEL` | 로컬 LLM 엔드포인트/모델 |
| `OCR_WORKER_COUNT`, `LLM_CONCURRENCY`, `DB_POOL_SIZE` | 동시성/자원 제한 |
| `AI_CONFIDENCE_THRESHOLD` | FAILED 판정 신뢰도 임계치 (기본 70) |
| `LLM_FORMAT_MAX_RETRIES` | Pydantic 검증 실패 시 재시도 횟수 (기본 5) |

## 실행

### 개발 (API + 워커 동시)

```bash
python dev.py
```

### 운영 (프로세스 분리)

상태 조회 API (FastAPI):
```bash
python main.py
# 또는: uvicorn app.main:app --host 0.0.0.0 --port 8100
```

OCR 워커 (큐 소비):
```bash
python -m app.worker
```

## 상태값 (`ai_status`)

| 값 | 의미 |
|----|------|
| `PENDING` | 작업 요청됨, 시작 전 |
| `PROCESSING` | 워커가 분석 중 |
| `DONE` | 분석 완료 (이후 수정 가능) |
| `FAILED` | OCR 실패 / 신뢰도 미달 / 검증 5회 실패 → 재분석 요청 |

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/health` | 헬스 체크 |
| `GET` | `/temp-documents/{temp_document_id}/status` | AI 처리 상태 폴링 |
| `GET` | `/users` | 연결 점검용 |

## 저장 형태

- **DOCUMENT**: `documents` 에 새 행 INSERT — `user_id`, `category_id`, `title`, `file_type`,
  `page_count`, `ocr_text`, `extracted_data`, `ai_confidence`,
  `issue_date`/`expiry_date`/`renewal_date`, `ai_status=DONE`. + `document_activities` 에 `AI_ANALYZED` 기록
- **RECEIPT**: `receipts` 에 새 행 INSERT(`input_method=OCR`).
- 두 경우 모두 `temp_documents.ai_status` 를 `DONE`(실패 시 `FAILED`)으로 갱신하며,
  `extracted_data._meta` 에 `type` / `confidence` / `ocr_confidence` / `llm_confidence` / `model` 을 기록한다.

## 메모

- 큐 페이로드는 `{"tempDocumentId": "<uuid>"}` 를 사용한다 (NestJS `UploadsService.requestAi`).
- LLM 분류 코드/카테고리는 [app/llm/classifier.py](app/llm/classifier.py) 의
  `DOCUMENT_CATEGORY_CODES`(= NestJS `DocumentCategoryCode`), `SPEND_CATEGORY_NAMES` 에서 관리한다.
  `SPEND_CATEGORY_NAMES` 는 실제 `spend_categories.name` 시드 값과 일치시켜야 매핑된다.
