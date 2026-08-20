from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.mongodb import close_mongo_connection, connect_to_mongo, get_db
from app.deps import require_ta
from app.models.user import UserPublic
from app.routers import assignments, auth, plagiarism, submissions

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Assignment Autograder API",
    description="Full-stack, AI-assisted assignment autograder (FastAPI + MongoDB + Gemini)",
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


@app.get("/api/system/storage")
async def storage_usage(
    current_user: UserPublic = Depends(require_ta),
    db=Depends(get_db),
):
    submission_count = await db.submissions.count_documents({})
    plagiarism_case_count = await db.plagiarism_cases.count_documents({})
    totals = await db.submissions.aggregate(
        [
            {
                "$group": {
                    "_id": None,
                    "data_bytes": {
                        "$sum": {
                            "$ifNull": [
                                "$code_bytes",
                                {"$strLenBytes": {"$ifNull": ["$code", ""]}},
                            ]
                        }
                    },
                }
            }
        ]
    ).to_list(length=1)
    data_bytes = totals[0]["data_bytes"] if totals else 0
    return {
        "submission_count": submission_count,
        "data_bytes": data_bytes,
        "plagiarism_case_count": plagiarism_case_count,
    }
