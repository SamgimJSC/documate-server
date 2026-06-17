# Documents API

## 개요

| 항목      | 내용                                 |
| --------- | ------------------------------------ |
| Base URL  | `/documents`                         |
| 인증 방식 | `X-Access-Token` HttpOnly 쿠키 (JWT) |
| 인증 필요 | 모든 엔드포인트 (Y)                  |

---

## 엔드포인트 목록

| 메서드 | 경로                                 | 설명                                    |
| ------ | ------------------------------------ | --------------------------------------- |
| GET    | `/documents/categories`              | 카테고리 전체 조회                      |
| GET    | `/documents/tags`                    | 내 태그 목록 조회                       |
| POST   | `/documents`                         | 문서 생성                               |
| GET    | `/documents`                         | 문서 목록 조회 (필터/검색/페이지네이션) |
| GET    | `/documents/:documentId`             | 문서 상세 조회                          |
| PATCH  | `/documents/:documentId`             | 문서 수정                               |
| PATCH  | `/documents/:documentId/favorite`    | 즐겨찾기 설정/해제                      |
| DELETE | `/documents/:documentId`             | 문서 삭제 (soft delete)                 |
| POST   | `/documents/:documentId/tags`        | 문서 태그 추가                          |
| DELETE | `/documents/:documentId/tags/:tagId` | 문서 태그 삭제                          |

---

## 공통 응답 형식

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": { ... }
}
```

---

## GET /documents/categories

카테고리 전체 목록을 반환합니다.

### 카테고리 목록

| code       | 이름       | 포함 문서 예시                       | 주요 추출 데이터                 |
| ---------- | ---------- | ------------------------------------ | -------------------------------- |
| `CONTRACT` | 계약서     | 임대차계약서, 근로계약서, 통신계약서 | 계약일, 만료일, 갱신일, 계약자   |
| `RECEIPT`  | 영수증     | 카드 영수증, 현금영수증, 결제내역    | 날짜, 가게명, 금액, 품목         |
| `MEDICAL`  | 병원/약국  | 처방전, 진료비 영수증, 약국 영수증   | 병원명, 진료일, 금액, 약품명     |
| `WARRANTY` | 보증서/A/S | 제품 보증서, 수리 접수증, A/S 내역서 | 제품명, 구매일, 보증기간, 수리일 |
| `ETC`      | 기타       | 분류 불가 문서, 일반 안내문, 메모    | 제목, 업로드일                   |

### Response

```json
{
  "data": [
    {
      "categoryId": 1,
      "code": "CONTRACT",
      "name": "계약서",
      "defaultNotifyOffsetDays": 30,
      "isSecured": false,
      "description": "임대차계약서, 근로계약서, 통신계약서 등"
    }
  ]
}
```

---

## GET /documents/tags

로그인한 사용자의 태그 목록을 반환합니다.

### Response

```json
{
  "data": [
    {
      "tagId": "uuid",
      "userId": "uuid",
      "name": "중요",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## POST /documents

문서를 생성합니다.

### Request Body

| 필드            | 타입        | 필수 | 설명                        |
| --------------- | ----------- | ---- | --------------------------- |
| `title`         | string      | Y    | 문서 제목 (최대 200자)      |
| `fileUrl`       | string      | Y    | 파일 URL (최대 500자)       |
| `fileName`      | string      | Y    | 파일 원본 이름 (최대 255자) |
| `fileType`      | enum        | Y    | `PDF` \| `JPG` \| `PNG`     |
| `categoryId`    | integer     | N    | 카테고리 ID                 |
| `fileSizeBytes` | string      | N    | 파일 크기 (bigint string)   |
| `pageCount`     | integer     | N    | 페이지 수                   |
| `ocrText`       | string      | N    | OCR 텍스트                  |
| `extractedData` | object      | N    | AI 추출 데이터 (JSONB)      |
| `aiConfidence`  | number      | N    | AI 신뢰도 (0~100)           |
| `issueDate`     | date string | N    | 발급일 (ISO 8601)           |
| `expiryDate`    | date string | N    | 만료일 (ISO 8601)           |
| `renewalDate`   | date string | N    | 갱신일 (ISO 8601)           |

### Response

생성된 문서 정보를 반환합니다.

---

## GET /documents

문서 목록을 필터/검색/정렬/페이지네이션 조건으로 조회합니다.

### Query Parameters

| 파라미터     | 타입    | 기본값      | 설명                                                  |
| ------------ | ------- | ----------- | ----------------------------------------------------- |
| `keyword`    | string  | -           | 제목/파일명/OCR 텍스트 ILIKE 검색                     |
| `categoryId` | integer | -           | 카테고리 필터                                         |
| `fileType`   | enum    | -           | `PDF` \| `JPG` \| `PNG`                               |
| `aiStatus`   | enum    | -           | `PENDING` \| `PROCESSING` \| `DONE` \| `FAILED`       |
| `isFavorite` | boolean | -           | `true` \| `false`                                     |
| `tagId`      | uuid    | -           | 해당 태그가 연결된 문서만 조회                        |
| `page`       | integer | 1           | 페이지 번호 (최소 1)                                  |
| `limit`      | integer | 20          | 페이지 크기 (1~100)                                   |
| `sort`       | string  | `createdAt` | `createdAt` \| `updatedAt` \| `title` \| `expiryDate` |
| `order`      | string  | `DESC`      | `ASC` \| `DESC`                                       |

### Response

```json
{
  "data": {
    "items": [ { ... } ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "hasNext": true
  }
}
```

---

## GET /documents/:documentId

문서 상세 정보를 조회합니다.

### Path Parameters

| 파라미터     | 타입 | 설명    |
| ------------ | ---- | ------- |
| `documentId` | uuid | 문서 ID |

### Response

문서 전체 필드 + `category`, `documentTags[].tag` relations 포함.

---

## PATCH /documents/:documentId

문서를 수정합니다. 수정 후 전체 상세 정보를 반환합니다.

### Request Body

| 필드            | 타입        | 설명                   |
| --------------- | ----------- | ---------------------- |
| `categoryId`    | integer     | 카테고리 ID            |
| `title`         | string      | 문서 제목 (최대 200자) |
| `ocrText`       | string      | OCR 텍스트             |
| `extractedData` | object      | AI 추출 데이터         |
| `aiConfidence`  | number      | AI 신뢰도 (0~100)      |
| `issueDate`     | date string | 발급일                 |
| `expiryDate`    | date string | 만료일                 |
| `renewalDate`   | date string | 갱신일                 |
| `isConfirmed`   | boolean     | AI 결과 확인 여부      |
| `aiStatus`      | enum        | AI 처리 상태           |

> 파일 관련 필드(`fileUrl`, `fileName`, `fileType`, `fileSizeBytes`, `pageCount`)는 수정 불가입니다.

---

## PATCH /documents/:documentId/favorite

즐겨찾기를 설정하거나 해제합니다.

### Request Body

```json
{ "isFavorite": true }
```

---

## DELETE /documents/:documentId

문서를 soft delete 처리합니다 (`isDeleted = true`). 실제 DB 레코드는 삭제되지 않습니다.

### Response

```json
{ "data": null }
```

---

## POST /documents/:documentId/tags

문서에 태그를 추가합니다. 동일 사용자에게 해당 태그가 없으면 자동 생성합니다.

### Request Body

```json
{ "name": "중요" }
```

- `name`: 태그 이름 (최대 30자, 앞뒤 공백 자동 제거)

---

## DELETE /documents/:documentId/tags/:tagId

문서에서 태그 연결을 제거합니다.

### Path Parameters

| 파라미터     | 타입 | 설명    |
| ------------ | ---- | ------- |
| `documentId` | uuid | 문서 ID |
| `tagId`      | uuid | 태그 ID |

---

## 에러 코드

| errorCode                     | HTTP | 설명                                     |
| ----------------------------- | ---- | ---------------------------------------- |
| `DOCUMENT_NOT_FOUND`          | 404  | 존재하지 않는 문서 (또는 접근 권한 없음) |
| `DOCUMENT_CATEGORY_NOT_FOUND` | 404  | 존재하지 않는 카테고리                   |
| `TAG_NOT_FOUND`               | 404  | 문서-태그 연결이 존재하지 않음           |
| `DOCUMENT_TAG_ALREADY_EXISTS` | 409  | 이미 추가된 태그                         |

---

## 보안 정책

- `userId`는 JWT 쿠키에서만 추출합니다. Request body/query/params에서 받지 않습니다.
- 모든 문서 조회/수정/삭제는 `documentId + userId + isDeleted=false` 3중 조건으로 처리합니다.
- 다른 사용자의 `documentId`를 알더라도 접근할 수 없습니다.

---

## 테스트용 Seed SQL

카테고리 API 테스트 전 아래 SQL로 기본 데이터를 삽입하세요.

```sql
INSERT INTO document_categories (code, name, default_notify_offset_days, is_secured, description) VALUES
  ('CONTRACT', '계약서',    30,   false, '임대차계약서, 근로계약서, 통신계약서 등'),
  ('RECEIPT',  '영수증',    NULL, false, '카드 영수증, 현금영수증, 결제내역 등'),
  ('MEDICAL',  '병원/약국', NULL, false, '처방전, 진료비 영수증, 약국 영수증 등'),
  ('WARRANTY', '보증서/AS', 365,  false, '제품 보증서, 수리 접수증, A/S 내역서 등'),
  ('ETC',      '기타',      NULL, false, '분류 불가 문서, 일반 안내문, 메모 등');
```

---

## 테스트 권장 순서

1. `GET /documents/categories` — 카테고리 목록 확인 (seed 필요)
2. `POST /documents` — 문서 생성 (`fileType` 필수)
3. `GET /documents` — 목록 조회 (keyword, categoryId 등 필터 테스트)
4. `GET /documents/:documentId` — 상세 조회
5. `PATCH /documents/:documentId` — 수정
6. `PATCH /documents/:documentId/favorite` — 즐겨찾기 토글
7. `POST /documents/:documentId/tags` — 태그 추가 (중복 추가 시 409 확인)
8. `GET /documents/tags` — 태그 목록 확인
9. `DELETE /documents/:documentId/tags/:tagId` — 태그 삭제
10. `DELETE /documents/:documentId` — soft delete 후 재조회 시 404 확인
