from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_pool, close_pool
from app.redis import init_redis, close_redis
from app.routers import users, documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    await init_redis()
    yield
    close_pool()
    await close_redis()


app = FastAPI(title="DocuMate OCR Server", lifespan=lifespan)

app.include_router(users.router)
app.include_router(documents.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
