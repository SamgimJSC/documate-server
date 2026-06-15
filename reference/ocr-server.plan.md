## 서비스 플로우

1. 클라이언트(C)에서 S3로 직접 이미지 업로드
2. C에서 API서버(A)으로 이미지 분석 요청
3. A에서 Redis(R)의 큐에 PUSH
4. OCR서버(O)에서 R의 큐로부터 POP
5. OCR분석 작업 시작
   1. OCR 라이브러리오 이미지 텍스트 추출
   2. 추출한 텍스트 로컬 LLM으로 receit, document 대분류 분류
   3. 로컬 JSON양식으로 포매팅
   4. 분류된 문서정보 DB 저장
6. C에서 3~5초 주기로 문서 상태 불러오기

## 스펙

- 언어: python
- 프레임워크: fastAPI
- ORM: SQLAlchemy
- LLM: Ollama - gemma3:4b(8GB) or gemma3:1b(4GB)
- OCR: PaddleOCR

## 내용 상세

- ocrPayload

```json
{
  "documentId": "uuid"
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
