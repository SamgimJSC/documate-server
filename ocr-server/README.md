# DocuMate OCR Server

업로드된 문서/영수증 이미지를 OCR + 로컬 LLM 으로 분석하는 Python 워커 서버.

## 서비스 플로우

1. 클라이언트 → S3 직접 업로드
2. 클라이언트 → API 서버(NestJS) `POST /documents/ai` 로 분석 요청
3. API 서버 → Redis 큐 `ocr:queue` 에 `RPUSH {"documentId": "<uuid>"}`
4. **OCR 워커** → `BLPOP` 으로 POP
5. 분석 작업
   1. `document_files` 의 S3 키로 이미지 다운로드
   2. PaddleOCR 로 텍스트 추출
   3. Ollama 로컬 LLM 으로 `RECEIPT` / `DOCUMENT` 대분류 + 핵심정보 추출
   4. 결과를 DB 저장 (`documents` 갱신, 영수증이면 `receipts` 행 생성)
   5. `documents.ai_status` → `DONE` (실패 시 `FAILED`)
6. 클라이언트 → 3~5초 주기로 상태 폴링

## 구성

```
app/
  config.py              # 환경설정 (DB/Redis/Ollama/S3)
  db/                    # psycopg2 커넥션 풀 (기존)
  redis/                 # async redis (FastAPI 측)
  s3/client.py           # S3 객체 다운로드 (boto3)
  ocr/engine.py          # PaddleOCR 래퍼 (지연 로딩)
  llm/classifier.py      # Ollama 분류/추출 + 출력 정규화
  repositories/          # documents / receipts / categories raw SQL
  services/analysis.py   # 단건 분석 오케스트레이션
  routers/documents.py   # GET /documents/{id}/status (폴링용)
  worker.py              # Redis 큐 소비 워커 (엔트리포인트)
main.py                  # FastAPI 실행 (상태 조회 API)
```

## 사전 준비

- PostgreSQL, Redis 기동 (API 서버와 동일 인스턴스)
- [Ollama](https://ollama.com) 설치 후 모델 pull:
  ```
  ollama pull gemma3:4b   # 8GB 환경 / 4GB 환경은 gemma3:1b
  ```
- `.env` 의 `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 채우기
  (루트 `.env.development` 의 AWS 값 참고)

## 설치

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> `paddlepaddle` 은 용량이 크다. GPU 환경이면 `paddlepaddle-gpu` 로 교체.

## 실행

상태 조회 API (FastAPI):
```
python main.py
```

OCR 워커 (큐 소비, 별도 프로세스):
```
python -m app.worker
```

## 저장 형태

- **DOCUMENT**: `documents` 갱신 — `category_id`, `ocr_text`, `extracted_data`,
  `ai_confidence`, `issue_date`/`expiry_date`/`renewal_date`, `page_count`, `ai_status=DONE`
- **RECEIPT**: `receipts` 행 생성(`input_method=OCR`) + 원본 `documents` 행도 `DONE` 처리.
  `extracted_data._meta` 에 `type`/`confidence`/`receipt_id` 기록
