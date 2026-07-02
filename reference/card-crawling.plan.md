# DocuMate 카드 크롤링 모듈 구현 작업계획

> 대상: `card-crawling/` (Python / Playwright + asyncio 크롤러)
> 목표: 카드고릴라 TOP100 카드 데이터를 크롤링 → 정규화 → PostgreSQL UPSERT

## 1. 목표 요약

시중 카드 TOP 100 목록을 웹크롤링하여 카드 상세 데이터(혜택/연회비/카드사 등)를 수집하고, 정규화하여 PostgreSQL에 저장한다. 저장된 카드 데이터는 이후 유저 소비패턴 기반 카드 추천 모듈에서 활용한다.

**이번 범위**: 웹크롤링 → 파싱/정규화 → DB UPSERT 하는 **파이썬 크롤링 코드만** 구현 (추천 로직은 별도).

**크롤링 대상**
- TOP100 목록: https://www.card-gorilla.com/chart/top100
- 각 카드 상세 페이지 (목록에서 수집한 URL/ID로 접근)

**핵심 제약**
- DB 마이그레이션/스키마는 NestJS API 서버가 담당. 크롤러는 `cards` 관련 테이블에 **조회/INSERT/UPDATE(UPSERT)만** 하고 DDL은 금지.
- 상대 서버 부하 고려: 동시 상세 크롤링 **10~20 concurrent**, 요청 간 rate limit / 랜덤 지연 적용.
- 재실행 시 중복 없이 최신값으로 갱신 (UPSERT 멱등성).

## 2. 크롤링 순서

1. **TOP100 목록 페이지 로드** (`chart/top100`)
2. **카드 URL/ID 수집** — 목록에서 상세페이지 링크(카드 ID) 우선 수집
3. **비동기 상세페이지 크롤링** (10~20 concurrent) — 수집한 URL을 병렬 처리
4. **정규화/파싱** — HTML → 구조화된 카드 데이터
5. **PostgreSQL UPSERT** — 카드 ID 기준 삽입/갱신

## 3. 사용 라이브러리

| 용도 | 라이브러리 |
| --- | --- |
| 브라우저 자동화/크롤링 | `Playwright` + `asyncio` (동적 렌더링 대응) |
| HTML 파싱 | `BeautifulSoup` 또는 `selectolax` |
| DB | `SQLAlchemy Core` + `asyncpg` (또는 `psycopg`) |
| 설정 | `pydantic-settings` |
| 재시도 | `tenacity` |
| 검증 | `Pydantic` (카드 데이터 스키마 validation) |

## 4. 디렉터리 구조 (Repository Pattern)

```
card-crawling/
├── app/
│   ├── __init__.py
│   ├── config.py            # pydantic-settings (DB URL, 동시성, 지연시간, 대상 URL)
│   ├── main.py              # 크롤링 파이프라인 진입점 (목록→상세→저장 오케스트레이션)
│   ├── db/
│   │   └── connection.py    # SQLAlchemy Core engine/pool, cards 테이블 autoload (DDL 금지)
│   ├── crawler/
│   │   ├── browser.py       # Playwright 브라우저/컨텍스트 생성·종료 (lifecycle)
│   │   ├── list_page.py     # TOP100 목록 → 카드 URL/ID 리스트 수집
│   │   └── detail_page.py   # 상세페이지 비동기 크롤링 (동시성 제어)
│   ├── parser/
│   │   └── card_parser.py   # HTML(BeautifulSoup/selectolax) → dict 파싱
│   ├── normalizer/
│   │   └── card_normalizer.py  # 연회비/혜택/카드사 등 정규화, 파싱 클린업
│   ├── models/
│   │   └── card.py          # Pydantic 카드 스키마 (validation)
│   └── repositories/
│       └── cards.py         # cards UPSERT (ON CONFLICT), 조회
├── dev.py                   # 로컬 단일/소량 크롤링 테스트 진입점
├── main.py                  # 운영 실행 진입점 (전체 배치)
├── requirements.txt
└── .env.example
```

## 5. 작업 단계

### Phase 0 — 기반 셋업

- [ ] `requirements.txt`: playwright, beautifulsoup4(또는 selectolax), sqlalchemy, asyncpg, pydantic, pydantic-settings, tenacity.
- [ ] `playwright install chromium` (브라우저 바이너리 설치).
- [ ] `app/config.py`: DB URL, `CONCURRENCY`(기본 15), 요청 지연(min/max), 대상 URL, 타임아웃, User-Agent.
- [ ] `.env.example` 작성.
- [ ] `db/connection.py`: SQLAlchemy Core engine, `cards` 테이블 `autoload_with`로 반영만 (DDL 미생성).

### Phase 1 — 목록 크롤링 (URL/ID 수집)

- [ ] `crawler/browser.py`: Playwright async 브라우저/컨텍스트 생성·정리, 공통 페이지 헬퍼.
- [ ] `crawler/list_page.py`:
  - TOP100 페이지 로드, 동적 렌더링/스크롤 대기 (필요 시 lazy-load 스크롤).
  - 각 카드의 상세 URL / 카드 ID + 순위(rank) 수집 → 리스트 반환.

### Phase 2 — 상세페이지 비동기 크롤링

- [ ] `crawler/detail_page.py`:
  - `asyncio.Semaphore(CONCURRENCY)` (10~20)로 동시성 제어.
  - 카드별 상세 HTML 수집, 요청 간 랜덤 지연.
  - `tenacity`로 타임아웃/일시 오류 재시도.
  - 실패 카드는 스킵하되 로그 기록 (부분 실패 허용).

### Phase 3 — 파싱 & 정규화

- [ ] `parser/card_parser.py`: 상세 HTML에서 카드명·카드사·연회비·주요혜택·이미지 URL·카드 유형(신용/체크) 등 원시 추출.
- [ ] `normalizer/card_normalizer.py`:
  - 연회비 숫자 정규화(문자열 → int, 국내/해외 구분).
  - 혜택 텍스트 정제 및 카테고리 태깅(향후 추천 매칭용).
  - 공백/특수문자 클린업, 결측 필드 기본값 처리.
- [ ] `models/card.py`: Pydantic 카드 모델로 검증. 실패 시 해당 카드 스킵+로그.

### Phase 4 — DB UPSERT

- [ ] `repositories/cards.py`:
  - 카드 ID(카드고릴라 ID 또는 URL slug)를 유니크 키로 `INSERT ... ON CONFLICT DO UPDATE`.
  - rank / 크롤링 시각(crawled_at) 갱신.
  - 파라미터 바인딩(Core), DDL 금지.
- [ ] 실제 `cards` 테이블 컬럼은 `DocuMate_DB_Schema 최종.xlsx` 확인 후 확정.

### Phase 5 — 오케스트레이션 & 실행

- [ ] `main.py` / `app/main.py`: 목록 수집 → 상세 병렬 크롤링 → 파싱/정규화 → 검증 → UPSERT 전체 파이프라인.
- [ ] `dev.py`: 소량(예: 상위 5개)만 크롤링하는 로컬 e2e 테스트 진입점.
- [ ] 실행 요약 로그(성공/실패/스킵 개수) 출력.

## 6. 동시성 / 부하 설계

| 구간 | 메커니즘 | 설정값 |
| --- | --- | --- |
| 상세 크롤링 | `asyncio.Semaphore` | `CONCURRENCY = 10~20` |
| 요청 간 지연 | 랜덤 sleep | min/max (예: 0.5~1.5s) |
| 외부 호출 재시도 | `tenacity` | 지수 백오프, 최대 3회 |
| DB | SQLAlchemy pool | 소규모 (예: 5) |

## 7. 실패 처리 규칙

1. 목록 페이지 로드 실패 → 배치 전체 중단 + 에러 로그.
2. 개별 상세 크롤링 실패(재시도 초과) → 해당 카드 스킵, 계속 진행.
3. Pydantic 검증 실패 → 해당 카드 스킵 + 원인 로그.
4. DB UPSERT 실패 → 해당 카드 스킵, 트랜잭션 롤백(카드 단위).

## 8. 검증 / 마무리

- [ ] `dev.py`로 상위 소량 카드 e2e (목록→상세→파싱→UPSERT) 확인.
- [ ] 재실행 멱등성 검증 (2회 실행 시 중복 없이 갱신).
- [ ] `robots.txt` / 이용약관 확인, rate limit 준수.
- [ ] 실제 DB 스키마(xlsx) 컬럼명 대조 후 리포지토리/모델 필드 확정.

## 9. 확정된 셀렉터 (reference HTML 기준)

카드고릴라는 Vue SPA 이며, 카드 링크가 `href="javascript:;"` 라 href 로는 ID 를
알 수 없다. 아래 셀렉터는 `card-crawling/reference/` 의 실제 저장 HTML 로 검증했다.

**목록(list_page)** — `.rk_lst li` (100개, 빈 li 는 `.card_img img` 없음으로 필터)

| 항목 | 위치 |
| --- | --- |
| 카드 ID | `.card_img img` 의 파일명 선행 숫자 (예: `2885card_1.png` → `2885`) |
| 순위(rank) | `.num` 텍스트 |
| 상세 URL | ID + `DETAIL_URL_TEMPLATE` 로 조립 |

**상세(card_parser)** — `.card_top` 기준

| 항목 | 셀렉터 |
| --- | --- |
| 카드명 | `.card_top .tit strong.card` |
| 발급사 | `.card_top .tit p.brand` |
| 카드 브랜드 | `.bnf2 .c_brand` (Visa/Mastercard 등) |
| 카드 이미지 | `.card_top .card_img img` |
| 연회비 | `.bnf2 .in_out span` (국내전용/해외겸용 + `<b>`금액) |
| 대표 혜택 요약 | `.bnf1 > dl` (dt=카테고리, dd strong=혜택, i=비고) |
| 상세 혜택 | `.benefit .bene_area dl` (dt=카테고리, dd=상세) |

> 검증 결과: 목록 100개 전부 ID/순위 추출, 상세(삼성 iD SELECT ALL)에서 카드명·발급사·
> 연회비(20,000원)·요약3건·상세11건 정상 파싱 확인.

## 10. 남은 오픈 이슈 / 확인 필요

- `cards` 테이블은 [card.entity.ts](../src/admin/entities/card.entity.ts) 로 확정
  (`card_id` uuid 자동생성 / `card_name` / `issuer` / `benefits` jsonb / `annual_fee` numeric / `img_url` / `source_url` / `crawled_at`).
- `card_id` 가 자동생성 uuid 이고 `source_url` 에 UNIQUE 제약이 없어 `ON CONFLICT` 불가 →
  `source_url` 기준 SELECT→UPDATE/INSERT 수동 UPSERT 로 구현. (개선: `source_url` UNIQUE 인덱스 추가 검토)
- 대기/렌더링: `wait_until="networkidle"` + 핵심 셀렉터 `wait_for_selector` + lazy-load 스크롤로 처리.
- 크롤링 주기 (수동 배치 / 스케줄러) 및 실행 위치(로컬/EC2) 결정.
