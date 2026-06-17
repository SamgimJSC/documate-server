# API 문서

## 모듈 목록

| 모듈 | Base URL | 인증 필요 | 설명 |
|---|---|---|---|
| [Auth](./auth.md) | `/auth` | N | 회원가입, 이메일 인증, 로그인 |
| [Users](./users.md) | `/users` | Y | 사용자 조회, 생성, 수정, 삭제 |
| [Documents](./documents.md) | `/documents` | Y | 문서 CRUD, 카테고리, 태그, 즐겨찾기, 검색/필터 |

---

## 공통 응답 형식

모든 API는 아래 형식으로 응답합니다.

```json
{
  "message": "SUCCESS",
  "error": "",
  "errorCode": "",
  "statusCode": 200,
  "data": { ... }
}
```

## 인증 방식

로그인 후 발급되는 `X-Access-Token` 쿠키가 인증이 필요한 API에 자동으로 포함됩니다.

| 쿠키명 | 속성 | 설명 |
|---|---|---|
| `X-Access-Token` | `HttpOnly`, `Secure`, `SameSite=Lax` | JWT Access Token |

## 공통 에러 코드

| errorCode | 설명 |
|---|---|
| `USER_NOT_FOUND` | 존재하지 않는 사용자 |
| `EMAIL_ALREADY_USED` | 이미 사용 중인 이메일 |
| `NICKNAME_ALREADY_USED` | 이미 사용 중인 닉네임 |
| `INVALID_PASSWORD` | 잘못된 비밀번호 |
| `INVALID_TOKEN` | 유효하지 않은 인증 토큰 |
| `EMAIL_SEND_FAILURE` | 이메일 발송 실패 |
| `INVALID_EMAIL_VERIFICATION` | 유효하지 않은 이메일 인증 |
