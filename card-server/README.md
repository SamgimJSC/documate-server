# DocuMate Card Server

카드 데이터 크롤링 + 소비패턴 기반 카드 추천을 담당하는 Python 서버.

> 스펙: [reference/card-recommendation.spec.md](reference/card-recommendation.spec.md)
> 설계: [reference/card-server.plan.md](reference/card-server.plan.md)

두 가지 역할을 한다.

1. **크롤링 배치** — 카드고릴라 TOP100 → 정규화 → `cards` UPSERT
2. **추천 서버** — FastAPI(API) + Redis 큐 워커. 유저 receipt 소비패턴을 분석해
   가장 적합한 카드 3개를 추천하고 `card_recommendations` 에 저장.

## 설치

```bash
python -m venv venv
venv\Scripts\activate            # (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
playwright install chromium      # 크롤링용
cp .env.example .env             # DB_URL 등 채우기
```

## 실행

```bash
# 1) 크롤링 배치 (cards 채우기)
python crawl.py            # 전체 TOP100
python crawl.py 5          # 상위 5개 (검증용)

# 2) 추천 서버
python main.py             # FastAPI (http://localhost:8200)
python -m app.worker       # 추천 워커 (card:queue 소비)
python dev.py              # API + 워커 동시 실행 (개발용)
```

## API (prefix `/cards`)

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/cards/recommendation?userId=` | 기존 추천 카드 목록 (없으면 빈 배열) |
| GET | `/cards/check?userId=` | receipt 유무. 없으면 기본 카드 3종 반환 |
| GET | `/cards/ai?userId=` | AI 추천 작업을 `card:queue` 에 넣음 |
| GET | `/health` | 헬스체크 |

> `userId` 는 회원 UUID. 운영에서는 NestJS API 서버가 인증된 사용자 ID 로 호출한다.

## 추천 로직 (worker)

1. `card:queue` BLPOP → `{"userId": "..."}`
2. 최근 `RECENT_DAYS`(30)일 receipts 를 spend_category 별로 합산
3. 소비 카테고리 ↔ 카드 `benefits.categories` 태그를 매칭해 점수화
   - 1순위: 소비 큰 카테고리와 혜택 연관성
   - 2순위: 연회비 낮은순
4. 상위 3개 선정 → 사유 문장 생성(Ollama, 실패 시 규칙 기반) → `card_recommendations` 저장

## 구조

```
app/
├── config.py             # 설정 (DB/Redis/Ollama/크롤링/추천)
├── server.py             # FastAPI 앱 (lifespan: DB풀 + Redis)
├── worker.py             # 추천 큐 워커 (BLPOP → 파이프라인)
├── crawler/              # 크롤링 (browser/list_page/detail_page/pipeline)
├── parser/ normalizer/   # 상세 HTML 파싱 + 정규화
├── models/               # Pydantic 카드 모델
├── llm/reason.py         # 추천 사유 생성 (Ollama + 폴백)
├── services/recommend.py # 추천 매칭 파이프라인
├── repositories/         # cards / receipts / spend_categories / recommendations
├── db/ redis/            # 커넥션 (동기 psycopg 풀 / redis.asyncio)
└── routers/cards.py      # /cards API
crawl.py                  # 크롤링 배치 진입점
main.py                   # API 서버 진입점
dev.py                    # API + 워커 동시 실행
```

## 주의

- DB 스키마/마이그레이션은 NestJS API 서버 소관. 이 서버는 조회/INSERT/UPDATE 만 하고 DDL 은 건드리지 않는다.
- 크롤러는 Windows 에서 Playwright(ProactorEventLoop)와 psycopg async 가 충돌하므로,
  DB 는 **동기 psycopg 풀**을 쓰고 `asyncio.to_thread`/스레드풀로 호출한다.
- `card_id` 는 자동생성 uuid, `source_url` 에 UNIQUE 제약이 없어 크롤러는 `source_url`
  기준 SELECT→UPDATE/INSERT 수동 UPSERT 로 멱등성을 확보한다.
