"""운영 실행 진입점 — 카드 추천 워커.

    python main.py

Redis `card:queue` 를 BLPOP 으로 소비해, 유저 소비패턴 기반 카드 3개를 추천하고
`card_recommendations` 에 저장한다. (클라이언트 API 는 NestJS API 서버가 담당)

크롤링 배치는 별도로 실행한다:  python crawl.py
"""
from app.worker import main

if __name__ == "__main__":
    main()
