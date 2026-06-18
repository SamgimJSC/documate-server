# DocuMate OCR Server 구현 작업계획

> 참조: [ocr-server.spec.md](./ocr-server.spec.md)
> 대상: `ocr-server/` (Python / FastAPI 워커 서버)

## 1. 목표 요약

Redis 큐로부터 `tempDocumentId`를 POP → PaddleOCR로 텍스트 추출 → Ollama(gemma3) 로컬 LLM으로 대분류/세부분류 및 JSON 포매팅 → Pydantic 검증 → `documents` / `receipts` 테이블에 저장하는 비동기 워커 서버를 구현한다.

**핵심 제약**

- DB 마이그레이션은 NestJS API 서버가 담당. 파이썬 서버는 **조회/수정만** 하고 스키마는 절대 건드리지 않는다 (SQLAlchemy Core, DDL 금지).
- `tempDocuments` 데이터는 분석 후에도 **삭제하지 않고 보존**.
- 자원 제한: `OCR_WORKER_COUNT=2`, `LLM_CONCURRENCY=1`, `DB_POOL_SIZE=2` (t3.medium + swap 4GB 환경).

## 2. 디렉터리 구조 (Repository Pattern)

```
ocr-server/
├── app/
│   ├── __init__.py
│   ├── config.py            # pydantic-settings 기반 환경설정
│   ├── main.py              # FastAPI 앱 (상태조회 API + lifespan에서 worker 기동)
│   ├── worker.py            # Redis 큐 컨슈머 루프 + 동시성 제어
│   ├── db/
│   │   └── connection.py    # SQLAlchemy Core engine, pool (DB_POOL_SIZE)
│   ├── redis/
│   │   └── connection.py    # redis 클라이언트, BLPOP 래퍼
│   ├── s3/
│   │   └── client.py        # boto3, 이미지 다운로드
│   ├── ocr/
│   │   └── engine.py        # PaddleOCR 래핑, 텍스트+정확도 평균 반환
│   ├── llm/
│   │   └── classifier.py    # Ollama 분류 + JSON 포매팅 + confidence
│   ├── repositories/
│   │   ├── documents.py     # documents 조회/수정
│   │   ├── receipts.py      # receipts 조회/수정
│   │   ├── categories.py    # 카테고리(대/세부분류) 조회
│   │   └── dates.py         # issue/expiry/renewal 날짜 처리 헬퍼
│   ├── routers/
│   │   ├── documents.py     # GET 상태조회 등
│   │   └── users.py
│   ├── models/              # Pydantic 스키마 (document/receipt validation)
│   │   ├── document.py
│   │   └── receipt.py
│   └── services/
│       └── analysis.py      # 전체 분석 파이프라인 오케스트레이션
├── dev.py                   # 로컬 개발 실행 진입점
├── main.py                  # 운영 실행 진입점
├── requirements.txt         # (작성됨)
└── .env.example
```

## 3. 작업 단계

### Phase 0 — 기반 셋업

- [ ] `app/config.py`: `pydantic-settings`로 환경변수 로드 (DB/Redis/S3/Ollama URL, 동시성 설정값, confidence 임계치 70, formatting 재시도 5회).
- [ ] `.env.example` 작성.
- [ ] `db/connection.py`: SQLAlchemy Core `create_engine`, `pool_size=DB_POOL_SIZE`, `Table` 메타데이터는 `autoload_with`로 **반영만** (DDL 미생성).
- [ ] `redis/connection.py`: 큐 키 정의, `BLPOP` 기반 POP 래퍼.
- [ ] `s3/client.py`: boto3로 `tempDocument`의 이미지 다운로드.

### Phase 1 — OCR

- [ ] `ocr/engine.py`: PaddleOCR 인스턴스(워커 프로세스/스레드 재사용), 이미지→텍스트 추출.
  - 추출 실패 시 예외 → 상위에서 `FAILED` 처리.
  - 토큰별 정확도(confidence) 전체 평균값 계산해 반환.
- [ ] `ThreadPoolExecutor(max_workers=OCR_WORKER_COUNT)`로 OCR 실행 (CPU 바운드 격리).

### Phase 2 — LLM 분류 & 포매팅

- [ ] `llm/classifier.py`:
  - (1) 대분류: `receipt(r)` / `document(d)` 분류 → 세부분류(카테고리) → 미분류 시 document `etc`.
  - (2) 프롬프트에 `0~100 confidence` 반환 지시.
  - (3) OCR 평균정확도 + LLM confidence 평균 → `ai_confidence` 계산. **70 미만이면 `FAILED`**.
  - (4) DB 저장용 JSON 포매팅 (부동산임대차계약서 / 영수증 등 타입별 `extracted_data`).
- [ ] `LLM_CONCURRENCY=1` → `asyncio.Semaphore(1)`로 직렬화 (OOM 방지).
- [ ] `categories.py` 리포지토리로 세부분류 매핑 조회.

### Phase 3 — Pydantic 검증 & 재시도

- [ ] `models/document.py`, `models/receipt.py`: DB 스키마(`reference/DocuMate_DB_Schema 최종.xlsx`)에 맞춘 Pydantic 모델.
- [ ] 검증 실패 시 LLM 포매팅 **최대 5회 재시도**, 모두 실패하면 `FAILED`.

### Phase 4 — DB 저장

- [ ] `repositories/documents.py` / `receipts.py`: 분류 결과를 INSERT/UPDATE (Core, 파라미터 바인딩).
- [ ] `dates.py`: `issue_date`/`expiry_date`/`renewal_date` 파생 처리.
- [ ] `tempDocuments`는 보존 (삭제 금지).

### Phase 5 — 워커 & 상태관리

- [ ] `services/analysis.py`: 전체 파이프라인 오케스트레이션.
  - 시작 시 `ai_status = PROCESSING` 갱신 → 성공 `DONE` / 실패 `FAILED`.
- [ ] `worker.py`: Redis BLPOP 루프, `tempDocumentId` 수신 → 분석 파이프라인 호출, 동시성 제어 적용.
- [ ] `ai_status` 상태머신: `PENDING → PROCESSING → DONE | FAILED`.

### Phase 6 — API

- [ ] `routers/documents.py`: `GET /uploads/:tempDocumentId` 상태 조회 (클라이언트 3~5초 폴링용).
- [ ] `main.py`: FastAPI lifespan에서 워커 태스크 기동/종료, health check.

## 4. 동시성 / 자원 설계

| 구간                | 메커니즘             | 설정값               |
| ------------------- | -------------------- | -------------------- |
| OCR (CPU 바운드)    | `ThreadPoolExecutor` | `OCR_WORKER_COUNT=2` |
| LLM (메모리 바운드) | `asyncio.Semaphore`  | `LLM_CONCURRENCY=1`  |
| DB                  | SQLAlchemy pool      | `DB_POOL_SIZE=2`     |
| 큐 소비             | `asyncio` BLPOP 루프 | -                    |

## 5. 실패 처리 규칙 (`FAILED` 판정)

1. OCR 텍스트 추출 실패
2. `ai_confidence`(OCR+LLM 평균) < 70
3. Pydantic 검증 5회 재시도 실패

→ 모두 `ai_status = FAILED`로 기록, 클라이언트가 재분석 요청.

## 6. 검증 / 마무리

- [ ] `dev.py`로 로컬 단일 메시지 처리 e2e 테스트 (S3 다운로드 → OCR → LLM → 검증 → DB).
- [ ] tenacity로 LLM/외부호출 재시도 정책 적용.
- [ ] 실제 DB 스키마(xlsx) 컬럼명 대조 후 리포지토리/모델 필드 확정.

## 7. 오픈 이슈 / 확인 필요

- t3.medium 크레딧 사용 가능 여부 + swap 4GB 설정.
- DB 스키마 정확한 컬럼/타입은 `DocuMate_DB_Schema 최종.xlsx` 확인 후 Pydantic 모델에 반영.
