# DocuMate 카드 크롤링

카드고릴라 TOP100 카드 데이터를 크롤링 → 정규화 → PostgreSQL(`cards`) UPSERT 하는 파이썬 모듈.

> 설계 문서: [../reference/card-crawling.plan.md](../reference/card-crawling.plan.md)

## 설치

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
playwright install chromium
```

## 설정

`.env.example` 를 `.env` 로 복사 후 `DB_URL` 등을 채운다.

```bash
cp .env.example .env
```

## 실행

```bash
# 소량 e2e 테스트 (상위 5개)
python dev.py
python dev.py 10        # 상위 10개

# 전체 TOP100 배치
python main.py
```

## 파이프라인

목록 수집 → 상세 병렬 크롤링(Semaphore, 10~20 동시) → 파싱(BeautifulSoup) →
정규화(연회비/혜택) → Pydantic 검증 → `cards` UPSERT(`source_url` 기준).

## 주의

- DB 스키마/마이그레이션은 NestJS API 서버 소관. 이 모듈은 `cards` 테이블에 조회/INSERT/UPDATE 만 하고 DDL 은 건드리지 않는다.
- `card_id` 는 DB 자동생성 uuid 이고 `source_url` 에 UNIQUE 제약이 없어, `ON CONFLICT` 대신 `source_url` 기준 SELECT→UPDATE/INSERT 수동 UPSERT 로 멱등성을 확보한다.
- 크롤링 셀렉터(list_page / card_parser)는 카드고릴라 실제 DOM 확인 후 확정이 필요하다 (코드 내 `NOTE(오픈이슈)` 참고).
