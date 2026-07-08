# 생체인증 구현 작업계획 (Challenge-based / FIDO2-like)

## 1. 목표 요약

서버가 랜덤 challenge를 생성하고 기기가 Secure Enclave / Android Keystore에 보관된 개인키로 서명 후 서버가 공개키로 검증하는 방식으로 생체인증을 구현한다.

refresh_token을 클라이언트에 노출하지 않는 기존 보안 모델을 유지하면서 별도의 생체인증 로그인 경로를 추가한다.

**핵심 원칙**

- 서버는 지문 / Face ID 정보를 저장하거나 검증하지 않는다.
- 서버는 기기의 공개키(`public_key`)와 challenge만 다룬다.
- 개인키는 iOS Secure Enclave / Android Keystore에서 절대 벗어나지 않는다.
- `refresh_token`은 기존과 동일하게 서버 DB에만 보관한다.
- 프론트엔드는 `react-native-biometrics` 라이브러리를 사용한다.

---

## 2. 전체 흐름

### 2-1. 생체인증 등록 흐름 (최초 1회)

```
[앱]
react-native-biometrics.createKeys()
→ RSA2048 키페어를 Secure Enclave / Keystore에서 생성
→ 공개키(publicKey) 반환

POST /auth/biometric/enable
Body: { enabled: true, biometric_type: "FACE" | "FINGER", public_key: string }
Authorization: Bearer access_token (로그인 상태 필요)

[서버]
user_security.biometric_enabled = true
user_security.biometric_type = FACE | FINGER
user_security.public_key = publicKey (저장)

Response: { success: true, is_biometric_enabled: true, biometric_type: "FACE" }
```

### 2-2. 생체인증 비활성화 흐름

```
POST /auth/biometric/enable
Body: { enabled: false }
Authorization: Bearer access_token

[서버]
user_security.biometric_enabled = false
user_security.biometric_type = null
user_security.public_key = null

Response: { success: true, is_biometric_enabled: false, biometric_type: null }
```

### 2-3. 생체인증 로그인 흐름

```
[앱]
POST /auth/biometric/challenge
Body: { email: string }

[서버]
유저 조회 → biometric_enabled 확인
랜덤 challenge 생성 (32바이트 Base64)
biometric_challenges 테이블에 저장 (5분 만료)
Response: { challenge: string, challenge_id: string }

[앱]
react-native-biometrics.createSignature({ promptMessage: '..', payload: challenge })
→ Face ID / 지문 인증 성공
→ signature 반환

POST /auth/biometric/verify
Body: { challenge_id: string, signature: string }

[서버]
challenge 조회 → 미사용 / 미만료 검증
user_security.public_key로 signature 검증
검증 성공 → access_token 발급 (기존 login과 동일)
challenge is_used = true
Response: access_token (httpOnly 쿠키)
```

---

## 3. API 명세

### POST /auth/biometric/enable
- 인증: 필요 (JwtAuthGuard)
- 역할: 생체인증 ON/OFF 설정 및 공개키 등록

**활성화 Request Body**
```json
{
  "enabled": true,
  "biometric_type": "FACE",
  "public_key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
}
```

**비활성화 Request Body**
```json
{ "enabled": false }
```

**활성화 Response**
```json
{
  "success": true,
  "is_biometric_enabled": true,
  "biometric_type": "FACE"
}
```

**비활성화 Response**
```json
{
  "success": true,
  "is_biometric_enabled": false,
  "biometric_type": null
}
```

**에러 코드**
```
BIOMETRIC_TYPE_REQUIRED   enabled=true인데 biometric_type 미제공
BIOMETRIC_TYPE_INVALID    FACE, FINGER 이외의 값
PUBLIC_KEY_REQUIRED       enabled=true인데 public_key 미제공
USER_NOT_FOUND
INVALID_TOKEN
```

---

### POST /auth/biometric/challenge
- 인증: 불필요
- 역할: 생체인증 로그인용 challenge 발급

**Request Body**
```json
{ "email": "user@example.com" }
```

**Response**
```json
{
  "challenge": "base64-encoded-random-32bytes",
  "challenge_id": "uuid"
}
```

**에러 코드**
```
USER_NOT_FOUND            이메일로 유저 없음
BIOMETRIC_NOT_ENABLED     biometric_enabled = false인 유저
```

---

### POST /auth/biometric/verify
- 인증: 불필요
- 역할: 서명 검증 후 access_token 발급

**Request Body**
```json
{
  "challenge_id": "uuid",
  "signature": "base64-encoded-signature"
}
```

**Response**
- access_token을 httpOnly 쿠키(`X-Access-Token`)로 설정
- Body: `null`

**에러 코드**
```
BIOMETRIC_AUTH_FAILED   모든 실패 케이스 (challenge 없음/만료/사용됨/서명 불일치)
                        → 공격자에게 실패 원인을 노출하지 않기 위해 단일 코드로 통합
```

---

## 4. DB 변경 사항

### 4-1. user_security — 컬럼 추가

> 기존 테이블에 `public_key` 컬럼 1개 추가. 나머지 컬럼은 변경 없음.

| 테이블명 | 컬럼명_영문 | 컬럼명_한글 | 타입 | 길이 | 제약 조건 |
|---|---|---|---|---|---|
| user_security | public_key | 생체인증 공개키 | VARCHAR | 2000 | nullable |

- RSA2048 공개키 PEM 형식 기준 약 450자. 여유분 포함 2000자 설정.
- 생체인증 비활성화 시 null로 초기화.
- 기기 교체 시 재등록하면 덮어쓰기.

### 4-2. biometric_challenges — 신규 테이블

> 생체인증 로그인용 challenge nonce를 임시 저장. 5분 만료 + 일회용.

| 테이블명 | 컬럼명_영문 | 컬럼명_한글 | 타입 | 길이 | 제약 조건 |
|---|---|---|---|---|---|
| biometric_challenges | challenge_id | 챌린지 ID | UUID | | PK, DEFAULT gen_random_uuid() |
| biometric_challenges | user_id | 사용자 ID | UUID | | FK → users(user_id), NOT NULL |
| biometric_challenges | challenge | 챌린지 nonce | VARCHAR | 255 | NOT NULL |
| biometric_challenges | is_used | 사용 여부 | BOOLEAN | | DEFAULT false, NOT NULL |
| biometric_challenges | expires_at | 만료 일시 | TIMESTAMPTZ | | NOT NULL |
| biometric_challenges | created_at | 생성 일시 | TIMESTAMPTZ | | DEFAULT now(), NOT NULL |

---

## 5. 신규 / 변경 파일 목록

### 신규 생성
```
src/auth/entities/biometric-challenge.entity.ts
src/auth/model/biometric-challenge.interface.ts
src/auth/model/biometric-challenge.repository.ts
src/auth/dto/biometricEnable.dto.ts
src/auth/dto/biometricChallenge.dto.ts
src/auth/dto/biometricVerify.dto.ts
src/database/migrations/XXXX_add_biometric_auth.ts
```

### 변경
```
src/users/entities/user-security.entity.ts   public_key 컬럼 추가
src/users/dto/updateUserSecurity.dto.ts      publicKey 필드 추가
src/auth/auth.module.ts                      BiometricChallenge entity/repo 등록
src/auth/auth.service.ts                     setBiometric, createChallenge, verifyChallenge 추가
src/auth/auth.controller.ts                  3개 라우트 추가
src/global/constants/errorCode.const.ts      에러 코드 5개 추가
```

---

## 6. 서명 검증 방식

`react-native-biometrics`는 **RSA2048 + SHA256withRSA** 서명을 사용한다.

서버 검증 로직:
```typescript
import * as crypto from 'crypto';

const verify = crypto.createVerify('SHA256');
verify.update(challenge);
const isValid = verify.verify(publicKey, signature, 'base64');
```

- `publicKey`: DB에 저장된 PEM 형식 공개키
- `challenge`: DB에서 조회한 원본 nonce 문자열
- `signature`: 클라이언트가 보낸 Base64 인코딩 서명값

---

## 7. 에러 코드 추가 목록

| 코드 | HTTP | 노출 엔드포인트 | 설명 |
|---|---|---|---|
| `BIOMETRIC_TYPE_REQUIRED` | 400 | /enable | enabled=true인데 biometric_type 미제공 |
| `BIOMETRIC_TYPE_INVALID` | 400 | /enable | FACE, FINGER 이외의 값 |
| `PUBLIC_KEY_REQUIRED` | 400 | /enable | enabled=true인데 public_key 미제공 |
| `BIOMETRIC_NOT_ENABLED` | 400 | /challenge | 생체인증 미등록 유저가 challenge 요청 |
| `BIOMETRIC_AUTH_FAILED` | 401 | /verify | 모든 검증 실패 통합 (challenge 불일치/만료/서명 오류) |

> **보안 원칙**: `/verify` 엔드포인트는 실패 원인을 `BIOMETRIC_AUTH_FAILED` 하나로만 반환한다.
> challenge 만료/사용됨/서명 불일치를 구분하면 공격자가 시도 전략을 수립할 수 있다.

---

## 8. 프론트엔드 연동 가이드 (메모)

**라이브러리**: `react-native-biometrics`

**생체인증 등록 시**
```ts
const rnBiometrics = new RNBiometrics();
const { publicKey } = await rnBiometrics.createKeys();
// POST /auth/biometric/enable with publicKey
```

**생체인증 로그인 시**
```ts
// 1. challenge 받기
const { challenge, challenge_id } = await api.post('/auth/biometric/challenge', { email });

// 2. 생체인증 + 서명 생성
const { signature } = await rnBiometrics.createSignature({
  promptMessage: '생체인증으로 로그인',
  payload: challenge,
});

// 3. 서버 검증
await api.post('/auth/biometric/verify', { challenge_id, signature });
```

**생체인증 비활성화 시**
```ts
await rnBiometrics.deleteKeys(); // 기기의 키페어 삭제
// POST /auth/biometric/enable with { enabled: false }
```

---

## 9. 작업 단계

- [ ] errorCode.const.ts — 에러 코드 6개 추가
- [ ] user-security.entity.ts — public_key 컬럼 추가
- [ ] updateUserSecurity.dto.ts — publicKey 필드 추가
- [ ] biometric-challenge.entity.ts 생성
- [ ] biometric-challenge.interface.ts 생성
- [ ] biometric-challenge.repository.ts 생성
- [ ] biometricEnable.dto.ts 생성
- [ ] biometricChallenge.dto.ts 생성
- [ ] biometricVerify.dto.ts 생성
- [ ] auth.module.ts — entity/repo 등록
- [ ] auth.service.ts — setBiometric / createChallenge / verifyChallenge 구현
- [ ] auth.controller.ts — 3개 라우트 추가
- [ ] DB 마이그레이션 파일 생성

---

## 10. 보안 고려사항

- challenge는 5분 만료 + 일회용 (`is_used = true`)
- public_key는 최초 등록 시 덮어쓰기 허용 (기기 교체 대응)
- 생체인증 비활성화 시 public_key를 null로 초기화
- verify 성공 시 기존 세션 유지 (새 auth_token 발급은 하지 않음 — 기존 로그인 세션과 공존)
  - 단, 최초 생체인증 로그인(기존 세션 없음) 시에는 신규 발급
