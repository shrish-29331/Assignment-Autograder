from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.mongodb import get_db
from app.deps import require_student, require_ta
from app.models.submission import PlagiarismReport
from app.models.user import UserPublic
from app.services.plagiarism_service import (
    DEFAULT_THRESHOLD,
    check_assignment_for_plagiarism,
)

router = APIRouter(prefix="/api/plagiarism", tags=["plagiarism"])


class PlagiarismDecisionRequest(BaseModel):
    decision: Literal["plag", "unplag"]
    comment: str | None = None


class PlagiarismContestRequest(BaseModel):
    concern: str


def _public_case(case: dict) -> dict:
    case = dict(case)
    case["case_id"] = str(case.pop("_id"))
    return case


@router.post("/{assignment_id}/check", response_model=PlagiarismReport)
async def run_plagiarism_check(
    assignment_id: str,
    threshold: float = Query(DEFAULT_THRESHOLD, ge=0.0, le=1.0),
    explain_top_n: int = Query(
        3,
        ge=0,
        le=10,
        description="How many top flagged pairs should receive an AI explanation",
    ),
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await check_assignment_for_plagiarism(
        db,
        assignment_id,
        threshold,
        explain_top_n,
    )


@router.get("/{assignment_id}/latest", response_model=PlagiarismReport | None)
async def get_latest_report(
    assignment_id: str,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db.plagiarism_reports.find_one(
        {"assignment_id": assignment_id},
        {"_id": 0},
    )
    return PlagiarismReport(**doc) if doc else None


@router.get("/{assignment_id}/cases")
async def assignment_cases(
    assignment_id: str,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return all currently flagged cases for the TA's assignment."""
    cursor = db.plagiarism_cases.find(
        {"assignment_id": assignment_id, "flagged": True}
    ).sort("updated_at", -1)

    return [_public_case(case) async for case in cursor]


@router.get("/mine")
async def my_plagiarism_cases(
    assignment_id: str | None = None,
    current_user: UserPublic = Depends(require_student),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {
        "flagged": True,
        "$or": [
            {"student_a": current_user.username},
            {"student_b": current_user.username},
        ],
    }
    if assignment_id:
        query["assignment_id"] = assignment_id

    cursor = db.plagiarism_cases.find(query, {"diff": 0}).sort(
        "updated_at", -1
    )
    return [_public_case(case) async for case in cursor]


@router.patch("/cases/{case_id}/decision")
async def decide_plagiarism_case(
    case_id: str,
    payload: PlagiarismDecisionRequest,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        object_id = ObjectId(case_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=404,
            detail="Plagiarism case not found",
        ) from exc

    case = await db.plagiarism_cases.find_one({"_id": object_id})
    if case is None:
        raise HTTPException(status_code=404, detail="Plagiarism case not found")

    assignment = await db.assignments.find_one(
        {
            "_id": ObjectId(case["assignment_id"]),
            "created_by": current_user.username,
        }
    )
    if assignment is None:
        raise HTTPException(status_code=403, detail="You do not own this assignment")

    await db.plagiarism_cases.update_one(
        {"_id": object_id},
        {
            "$set": {
                "ta_decision": payload.decision,
                "ta_comment": payload.comment,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated = await db.plagiarism_cases.find_one({"_id": object_id})
    return _public_case(updated)


@router.post("/cases/{case_id}/contest")
async def contest_plagiarism_case(
    case_id: str,
    payload: PlagiarismContestRequest,
    current_user: UserPublic = Depends(require_student),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if not payload.concern.strip():
        raise HTTPException(status_code=400, detail="Concern cannot be empty")

    try:
        object_id = ObjectId(case_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=404,
            detail="Plagiarism case not found",
        ) from exc

    case = await db.plagiarism_cases.find_one({"_id": object_id})
    if case is None:
        raise HTTPException(status_code=404, detail="Plagiarism case not found")

    if current_user.username not in {
        case.get("student_a"),
        case.get("student_b"),
    }:
        raise HTTPException(
            status_code=403,
            detail="You cannot contest this case",
        )

    await db.plagiarism_cases.update_one(
        {"_id": object_id},
        {
            "$set": {
                "student_concern": payload.concern.strip(),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated = await db.plagiarism_cases.find_one({"_id": object_id})
    return _public_case(updated)
