from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.mongodb import close_mongo_connection, connect_to_mongo
from app.routers import assignments, auth, plagiarism, submissions

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Assignment Autograder Pro API",
    description="Full-stack, AI-assisted assignment autograder (FastAPI + MongoDB + Claude)",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(plagiarism.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
