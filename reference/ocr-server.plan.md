# DocuMate OCR Server

업로드된 문서/영수증 이미지를 OCR + 로컬 LLM 으로 분석하는 Python 워커 서버.

## 서비스 플로우

1. 클라이언트(C)에서 S3로 직접 이미지 업로드
   1. GET /uploads/start
   2. POST /uploads/:tempDocumentId
2. C에서 API서버(A)으로 이미지 분석 요청
   1. POST /uploads/:tempDocumentId/ai
3. A에서 Redis(R)의 큐에 PUSH
4. OCR서버(O)에서 R의 큐로부터 POP
5. OCR분석 작업 시작
   1. OCR 라이브러리로 이미지 텍스트 추출
      - 실패시 `FAILED`
      - paddle OCR에서 추출한 텍스트의 정확도의 전체 평균값 계산
   2. 추출한 텍스트 로컬 LLM으로 receit, document 대분류 분류
      - 대분류 (r, d) → 세부분류(카테고리) → 분류안된 최종은 document의 etc로 분류
      - LLM 프롬프트에 신뢰도 평가하도록 작성
        - 예시: 문서를 분석하고 0~100 사이 confidence를 반환해라.
      - OCR, LLM 신뢰도 평균내서 ai_confidence값 계산
      - ai_confidence값이 70을 하회하면 분석 실패로 판정하고 `FAILED`
   3. 로컬 LLM으로 OCR추출된 텍스트 DB에 넣을수 있는 JSON양식으로 포매팅
      - JSON 데이터 예시
        - 부동산임대차계약서
          ```json
          {
            "document_id": "d8d90f8b-f7a8-4f70-a6d4-7d0d8d0e8e31",
            "user_id": "f4c8c7c4-8b8f-4b7d-b4d5-5b1f95f0a0c2",
            "category_id": 3,
            "title": "전세계약서_2025.pdf",
            "file_type": "JPG",
            "file_size_bytes": 2489371,
            "page_count": 4,
            "ocr_text": "주택임대차계약서 임대인 홍길동 임차인 김철수 계약기간 2025-03-01 ~ 2027-02-28 보증금 30000000원 월세 500000원...",
            "extracted_data": {
              "document_type": "LEASE_CONTRACT",
              "landlord_name": "홍길동",
              "tenant_name": "김철수",
              "deposit_amount": 30000000,
              "monthly_rent": 500000,
              "property_address": "서울특별시 강남구 테헤란로 123",
              "contract_start_date": "2025-03-01",
              "contract_end_date": "2027-02-28"
            },
            "ai_confidence": 97.52,
            "issue_date": "2025-03-01",
            "expiry_date": "2027-02-28",
            "renewal_date": null,
            "is_masked": false,
            "is_favorite": true,
            "ai_status": "DONE",
            "is_confirmed": false,
            "created_at": "2026-06-18T09:30:00Z",
            "updated_at": "2026-06-18T09:30:12Z",
            "is_deleted": "N"
          }
          ```
        - 영수증
          ```json
          {
            "receipt_id": "8f5a5c2b-6e7d-4c58-a1f7-92f2c3c5d8f1",
            "user_id": "f4c8c7c4-8b8f-4b7d-b4d5-5b1f95f0a0c2",
            "spend_category_id": 1,
            "input_method": "OCR",
            "file_url": "receipts/2026/06/18/8f5a5c2b-6e7d-4c58-a1f7-92f2c3c5d8f1.jpg",
            "store_name": "스타벅스 강남역점",
            "store_address": "서울특별시 강남구 테헤란로 101",
            "total_amount": 6500,
            "purchase_date": "2026-06-18",
            "payment_item": "아메리카노, 샌드위치",
            "memo": "회의 전에 간단히 식사",
            "ocr_text": "스타벅스 강남역점 아메리카노 4500 샌드위치 2000 합계 6500 카드결제",
            "extracted_data": {
              "items": [
                {
                  "name": "아메리카노",
                  "quantity": 1,
                  "unit_price": 4500,
                  "amount": 4500
                },
                {
                  "name": "샌드위치",
                  "quantity": 1,
                  "unit_price": 2000,
                  "amount": 2000
                }
              ],
              "payment_method": "CARD",
              "approval_no": "12345678",
              "_meta": {
                "confidence": 98.3,
                "ocr_engine": "PaddleOCR",
                "model": "gemma3:4b"
              }
            },
            "ai_status": "DONE",
            "is_confirmed": false,
            "created_at": "2026-06-18T10:15:00Z",
            "updated_at": "2026-06-18T10:15:04Z",
            "is_deleted": "N"
          }
          ```
      - Pydantic 사용해서 DB 스키마양식에 맞도록 validation
        - 통과하지 못하면 LLM formatting 반복 실행 → 5회
        - 5회 시도했는데 실패시 분석 실패로 판정하고 `FAILED`
   4. 분류된 문서 정보 DB 저장
      - documents 혹은 receits 데이터 DB 저장하기
      - tempDocuments의 데이터들은 삭제하지 않고 보존
6. C에서 3~5초 주기로 문서 상태 조회해서 상태 갱신
   1. GET /uploads/:tempDocumentId

## 스펙

- OS: Amazon Linux
- EC2: t3.medium → 크레딧으로 사용가능한지 확인
  - swap memory 4GB 걸어서 OOM방지
- 언어: python
- 프레임워크: fastAPI
- ORM: SQLAlchemy Core(Repository Pattern)
- LLM: Ollama - gemma3:1b(4GB)
- OCR: PaddleOCR
- 객체검증: Pydantic
- 병렬처리, 자원제한
  - asyncio, ThreadPoolExecutor 사용
  - 설정값
    - OCR_WORKER_COUNT = 2
    - LLM_CONCURRENCY = 1
    - DB_POOL_SIZE = 2

## 주의사항

- DB의 마이그레이션은 Nestjs API 서버에서 담당하므로 파이썬 워커 서버에서는 조회, 수정만 하고 스키마를 절대 건들지 않는다.

## 내용 상세

- ocrPayload

```json
{
  "tempDocumentId": "uuid"
}
```

### ai_status

- 해당 문서의 AI 서버 작업상태
  - `PENDING`: 작업요청은 했지만 시작하지 않은 상태
  - `PROCESSING`: AI 서버가 작업중
  - `DONE`: AI 작업완료
  - `FAILED`: 무엇인가의 이유로 작업실패
- 클라이언트는 문서가 PENDING, PROCESSING 상태일 경우 로딩 UI 보여주기
- DONE 상태가 되면 그때 부터 수정 가능
- FAILED 상태가 되면 재분석 요청하기
