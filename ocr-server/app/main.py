from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_pool, close_pool
from app.redis import init_redis, close_redis
from app.routers import users


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    await init_redis()
    yield
    close_pool()
    await close_redis()


app = FastAPI(lifespan=lifespan)

app.include_router(users.router)
