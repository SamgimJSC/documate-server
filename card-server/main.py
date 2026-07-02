"""운영 실행 진입점 — FastAPI 카드 서버(API).

    python main.py

카드 추천 워커는 별도로 실행한다:  python -m app.worker
개발 중 둘을 함께 띄우려면:        python dev.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.server:app", host="localhost", port=8200, reload=True)
