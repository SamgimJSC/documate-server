# Users API

Base URL: `/users`

사용자 관리 API입니다. 모든 엔드포인트는 JWT 인증이 필요합니다.

---

## 인증

모든 요청에 `X-Access-Token` 쿠키가 포함되어야 합니다. 로그인 시 자동으로 설정됩니다.

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

## 에러 코드

| errorCode               | 설명                     |
| ----------------------- | ------------------------ |
| `USER_NOT_FOUND`        | 존재하지 않는 사용자     |
| `EMAIL_ALREADY_USED`    | 이미 사용 중인 이메일    |
| `NICKNAME_ALREADY_USED` | 이미 사용 중인 닉네임    |
| `INVALID_NICKNAME`      | 잘못된 닉네임 형식       |
| `INVALID_TOKEN`         | 유효하지 않은 인증 토큰  |
| `INVALID_PIN`           | PIN 불일치               |
| `PIN_NOT_SET`           | PIN이 설정되어 있지 않음 |

---

## 엔드포인트

### 1. 사용자 목록 조회

조건에 맞는 사용자 목록을 조회합니다. 모든 쿼리 파라미터는 선택 사항입니다.

```
GET /users
```

**Query Parameters**

| 파라미터   | 타입   | 필수 | 설명                       |
| ---------- | ------ | ---- | -------------------------- |
| `email`    | string | N    | 이메일 (최대 255자)        |
| `nickname` | string | N    | 닉네임 (최대 30자)         |
| `role`     | string | N    | 역할 (`ADMIN` \| `MEMBER`) |
| `plan`     | string | N    | 플랜 (`FREE` \| `PRO`)     |

**Request 예시**

```
GET /users?role=MEMBER&plan=FREE
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "홍길동",
      "realName": null,
      "profileImgUrl": null,
      "role": "MEMBER",
      "plan": "FREE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**에러 응답**

| HTTP Status | errorCode       | 설명                     |
| ----------- | --------------- | ------------------------ |
| 401         | `INVALID_TOKEN` | 인증 토큰 없음 또는 만료 |

---

### 2. 사용자 단건 조회

UUID로 특정 사용자를 조회합니다.

```
GET /users/:id
```

**Path Parameters**

| 파라미터 | 타입          | 필수 | 설명        |
| -------- | ------------- | ---- | ----------- |
| `id`     | string (UUID) | Y    | 사용자 UUID |

**Request 예시**

```
GET /users/550e8400-e29b-41d4-a716-446655440000
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "nickname": "홍길동",
    "realName": null,
    "profileImgUrl": null,
    "role": "MEMBER",
    "plan": "FREE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**에러 응답**

| HTTP Status | errorCode        | 설명                     |
| ----------- | ---------------- | ------------------------ |
| 401         | `INVALID_TOKEN`  | 인증 토큰 없음 또는 만료 |
| 404         | `USER_NOT_FOUND` | 해당 ID의 사용자 없음    |

---

### 3. 사용자 생성

새 사용자를 직접 생성합니다. (관리자용)

```
POST /users
```

**Request Body**

| 필드            | 타입   | 필수 | 설명                                   |
| --------------- | ------ | ---- | -------------------------------------- |
| `email`         | string | Y    | 이메일 주소                            |
| `password`      | string | Y    | 비밀번호 (8~20자, 영문+숫자 조합 필수) |
| `nickname`      | string | Y    | 닉네임 (2~8자, 한글 또는 영문만 허용)  |
| `realName`      | string | N    | 실명 (최대 50자)                       |
| `profileImgUrl` | string | N    | 프로필 이미지 URL (최대 500자)         |

**Request 예시**

```json
{
  "email": "newuser@example.com",
  "password": "password1",
  "nickname": "김철수",
  "realName": "김철수",
  "profileImgUrl": "https://example.com/profile.jpg"
}
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "nickname": "김철수"
  }
}
```

**에러 응답**

| HTTP Status | errorCode               | 설명                     |
| ----------- | ----------------------- | ------------------------ |
| 401         | `INVALID_TOKEN`         | 인증 토큰 없음 또는 만료 |
| 409         | `EMAIL_ALREADY_USED`    | 이미 사용 중인 이메일    |
| 409         | `NICKNAME_ALREADY_USED` | 이미 사용 중인 닉네임    |

---

### 4. 사용자 정보 수정

기존 사용자의 정보를 수정합니다. 변경할 필드만 포함하면 됩니다.

```
PATCH /users/:id
```

**Path Parameters**

| 파라미터 | 타입          | 필수 | 설명        |
| -------- | ------------- | ---- | ----------- |
| `id`     | string (UUID) | Y    | 사용자 UUID |

**Request Body**

| 필드            | 타입   | 필수 | 설명                           |
| --------------- | ------ | ---- | ------------------------------ |
| `email`         | string | N    | 이메일 주소                    |
| `password`      | string | N    | 비밀번호 (8~255자)             |
| `nickname`      | string | N    | 닉네임 (최대 30자)             |
| `realName`      | string | N    | 실명 (최대 50자)               |
| `profileImgUrl` | string | N    | 프로필 이미지 URL (최대 500자) |

**Request 예시**

```json
{
  "nickname": "새닉네임",
  "profileImgUrl": "https://example.com/new-profile.jpg"
}
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "nickname": "새닉네임"
  }
}
```

**에러 응답**

| HTTP Status | errorCode               | 설명                     |
| ----------- | ----------------------- | ------------------------ |
| 401         | `INVALID_TOKEN`         | 인증 토큰 없음 또는 만료 |
| 404         | `USER_NOT_FOUND`        | 해당 ID의 사용자 없음    |
| 409         | `EMAIL_ALREADY_USED`    | 이미 사용 중인 이메일    |
| 409         | `NICKNAME_ALREADY_USED` | 이미 사용 중인 닉네임    |

---

### 5. PIN 검증

현재 설정된 PIN이 맞는지 확인합니다. PIN 재설정 전 기존 PIN을 검증할 때 사용합니다.

```
POST /users/me/pin/verify
```

**HTTP Status**: `204 No Content`

**Request Body**

| 필드        | 타입   | 필수 | 설명                  |
| ----------- | ------ | ---- | --------------------- |
| `pinNumber` | string | Y    | 검증할 6자리 숫자 PIN |

**Request 예시**

```json
{
  "pinNumber": "123456"
}
```

**Response**

성공 시 응답 본문 없이 `204 No Content`를 반환합니다.

**에러 응답**

| HTTP Status | errorCode       | 설명                     |
| ----------- | --------------- | ------------------------ |
| 401         | `INVALID_TOKEN` | 인증 토큰 없음 또는 만료 |
| 401         | `PIN_NOT_SET`   | PIN이 설정되어 있지 않음 |
| 401         | `INVALID_PIN`   | PIN 불일치               |

---

### 6. PIN 재설정

현재 PIN을 검증한 뒤 새 PIN으로 변경합니다.

```
PATCH /users/me/pin
```

**HTTP Status**: `204 No Content`

**Request Body**

| 필드         | 타입   | 필수 | 설명                     |
| ------------ | ------ | ---- | ------------------------ |
| `currentPin` | string | Y    | 현재 6자리 숫자 PIN      |
| `newPin`     | string | Y    | 변경할 새 6자리 숫자 PIN |

**Request 예시**

```json
{
  "currentPin": "123456",
  "newPin": "654321"
}
```

**Response**

성공 시 응답 본문 없이 `204 No Content`를 반환합니다.

**에러 응답**

| HTTP Status | errorCode       | 설명                     |
| ----------- | --------------- | ------------------------ |
| 401         | `INVALID_TOKEN` | 인증 토큰 없음 또는 만료 |
| 401         | `PIN_NOT_SET`   | PIN이 설정되어 있지 않음 |
| 401         | `INVALID_PIN`   | 현재 PIN 불일치          |

---

### 7. 사용자 삭제

사용자를 삭제합니다. (소프트 삭제)

```
DELETE /users/:id
```

**HTTP Status**: `204 No Content`

**Path Parameters**

| 파라미터 | 타입          | 필수 | 설명        |
| -------- | ------------- | ---- | ----------- |
| `id`     | string (UUID) | Y    | 사용자 UUID |

**Query Parameters**

| 파라미터 | 타입   | 필수 | 설명      |
| -------- | ------ | ---- | --------- |
| `reason` | string | N    | 삭제 사유 |

**Request 예시**

```
DELETE /users/550e8400-e29b-41d4-a716-446655440000?reason=회원탈퇴
```

**Response**

성공 시 응답 본문 없이 `204 No Content`를 반환합니다.

**에러 응답**

| HTTP Status | errorCode        | 설명                     |
| ----------- | ---------------- | ------------------------ |
| 401         | `INVALID_TOKEN`  | 인증 토큰 없음 또는 만료 |
| 404         | `USER_NOT_FOUND` | 해당 ID의 사용자 없음    |

---

### 8. 닉네임 변경

현재 로그인한 사용자의 닉네임을 변경합니다. 닉네임 중복은 허용합니다.

```
PATCH /users/me/nickname
```

**Request Body**

| 필드       | 타입   | 필수 | 설명                                                    |
| ---------- | ------ | ---- | ------------------------------------------------------- |
| `nickname` | string | Y    | 닉네임 (앞뒤 공백 제거 후 2~8자, 한글 또는 영문만 허용) |

**Request 예시**

```json
{
  "nickname": "새닉네임"
}
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": {
    "success": true,
    "nickname": "새닉네임"
  }
}
```

**에러 응답**

| HTTP Status | errorCode          | 설명                     |
| ----------- | ------------------ | ------------------------ |
| 400         | `INVALID_NICKNAME` | 닉네임 형식 오류         |
| 401         | `INVALID_TOKEN`    | 인증 토큰 없음 또는 만료 |
| 404         | `USER_NOT_FOUND`   | 사용자 없음              |
