# Auth API

Base URL: `/auth`

인증 관련 API입니다. 회원가입 전 이메일 인증이 필수이며, 로그인 시 Access Token은 HTTP-only 쿠키로 발급됩니다.

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

| errorCode | 설명 |
|---|---|
| `EMAIL_ALREADY_USED` | 이미 사용 중인 이메일 |
| `NICKNAME_ALREADY_USED` | 이미 사용 중인 닉네임 |
| `INVALID_PASSWORD` | 잘못된 비밀번호 |
| `INVALID_TOKEN` | 유효하지 않은 토큰 |
| `EMAIL_SEND_FAILURE` | 이메일 발송 실패 |
| `INVALID_EMAIL_VERIFICATION` | 유효하지 않은 이메일 인증 |

---

## 엔드포인트

### 1. 이메일 인증 코드 발송

회원가입 또는 비밀번호 재설정 전 이메일로 인증 코드를 발송합니다.

```
POST /auth/email-verification/send
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | Y | 인증 코드를 받을 이메일 주소 |
| `purpose` | string | Y | 인증 목적 (`SIGNUP` \| `RESET_PW`) |

**Request 예시**

```json
{
  "email": "user@example.com",
  "purpose": "SIGNUP"
}
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": null
}
```

---

### 2. 이메일 인증 코드 확인

발송된 인증 코드를 검증하고, 성공 시 `emailVerificationId`를 반환합니다. 회원가입에 사용됩니다.

```
POST /auth/email-verification/verify
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `emailVerificationId` | string (UUID) | Y | 발송 단계에서 발급된 인증 ID |
| `codeNumber` | string | Y | 이메일로 받은 6자리 숫자 인증 코드 |

**Request 예시**

```json
{
  "emailVerificationId": "550e8400-e29b-41d4-a716-446655440000",
  "codeNumber": "123456"
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
    "emailVerificationId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**에러 응답**

| HTTP Status | errorCode | 설명 |
|---|---|---|
| 401 | `INVALID_EMAIL_VERIFICATION` | 인증 코드 불일치 또는 만료 |

---

### 3. 회원가입

이메일 인증이 완료된 후 신규 회원을 등록합니다.

```
POST /auth/signup
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | Y | 이메일 주소 |
| `password` | string | Y | 비밀번호 (8~20자, 영문+숫자 조합 필수) |
| `nickname` | string | Y | 닉네임 (2~8자, 한글 또는 영문만 허용) |
| `pinNumber` | string | Y | 6자리 숫자 PIN |
| `emailVerificationId` | string (UUID) | Y | 인증 완료된 `emailVerificationId` |

**Request 예시**

```json
{
  "email": "user@example.com",
  "password": "password1",
  "nickname": "홍길동",
  "pinNumber": "123456",
  "emailVerificationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": null
}
```

**에러 응답**

| HTTP Status | errorCode | 설명 |
|---|---|---|
| 409 | `EMAIL_ALREADY_USED` | 이미 가입된 이메일 |
| 409 | `NICKNAME_ALREADY_USED` | 이미 사용 중인 닉네임 |
| 401 | `INVALID_EMAIL_VERIFICATION` | 유효하지 않은 이메일 인증 ID |

---

### 4. 로그인

이메일과 비밀번호로 로그인합니다. 성공 시 `X-Access-Token` 쿠키가 설정됩니다.

```
POST /auth/login
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | Y | 이메일 주소 |
| `password` | string | Y | 비밀번호 |

**Request 예시**

```json
{
  "email": "user@example.com",
  "password": "password1"
}
```

**Response**

응답 본문은 없으며(`data: null`), HTTP-only 쿠키로 Access Token이 발급됩니다.

| 쿠키명 | 속성 | 설명 |
|---|---|---|
| `X-Access-Token` | `HttpOnly`, `Secure`, `SameSite=Lax` | JWT Access Token |

**Response 예시**

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": null
}
```

**에러 응답**

| HTTP Status | errorCode | 설명 |
|---|---|---|
| 404 | `USER_NOT_FOUND` | 존재하지 않는 이메일 |
| 401 | `INVALID_PASSWORD` | 비밀번호 불일치 |

---

## 회원가입 플로우

```
1. POST /auth/email-verification/send   → 이메일로 인증 코드 발송
2. POST /auth/email-verification/verify → 인증 코드 검증, emailVerificationId 발급
3. POST /auth/signup                    → emailVerificationId를 포함하여 회원가입
```
