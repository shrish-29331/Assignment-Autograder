from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_db
from app.deps import require_ta
from app.models.submission import PlagiarismPair, PlagiarismReport
from app.models.user import UserPublic
from app.services import ai_service
from app.services.plagiarism_service import pairwise_similarity

router = APIRouter(prefix="/api/plagiarism", tags=["plagiarism"])

DEFAULT_THRESHOLD = 0.8


@router.post("/{assignment_id}/check", response_model=PlagiarismReport)
async def run_plagiarism_check(
    assignment_id: str,
    threshold: float = Query(DEFAULT_THRESHOLD, ge=0.0, le=1.0),
    explain_top_n: int = Query(3, ge=0, le=10, description="How many top flagged pairs to get an AI explanation for"),
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    cursor = db.submissions.find({"assignment_id": assignment_id})
    submissions = [
        {"submission_id": str(doc["_id"]), "student": doc["student_username"], "code": doc["code"]}
        async for doc in cursor
    ]

    # Keep only each student's most recent submission so re-submits don't
    # self-flag or dilute the comparison.
    latest_by_student: dict[str, dict] = {}
    for doc in submissions:
        latest_by_student[doc["student"]] = doc
    deduped = list(latest_by_student.values())

    raw_pairs = pairwise_similarity(deduped)

    pairs: list[PlagiarismPair] = []
    code_by_id = {s["submission_id"]: s["code"] for s in deduped}
    flagged_count = 0
    for p in raw_pairs:
        flagged = p["similarity"] >= threshold
        explanation = None
        if flagged and flagged_count < explain_top_n:
            explanation = await ai_service.explain_plagiarism_pair(
                code_a=code_by_id[p["submission_id_a"]],
                code_b=code_by_id[p["submission_id_b"]],
                similarity=p["similarity"],
            )
            flagged_count += 1
        pairs.append(
            PlagiarismPair(
                submission_id_a=p["submission_id_a"],
                student_a=p["student_a"],
                submission_id_b=p["submission_id_b"],
                student_b=p["student_b"],
                similarity=p["similarity"],
                flagged=flagged,
                ai_explanation=explanation,
            )
        )

    report = PlagiarismReport(
        assignment_id=assignment_id,
        generated_at=datetime.now(timezone.utc),
        threshold=threshold,
        pairs=pairs,
    )

    await db.plagiarism_reports.update_one(
        {"assignment_id": assignment_id},
        {"$set": report.model_dump()},
        upsert=True,
    )
    return report


@router.get("/{assignment_id}/latest", response_model=PlagiarismReport | None)
async def get_latest_report(
    assignment_id: str,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db.plagiarism_reports.find_one({"assignment_id": assignment_id}, {"_id": 0})
    return PlagiarismReport(**doc) if doc else None
