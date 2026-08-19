from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_db
from app.deps import get_current_user, require_student, require_ta
from app.models.submission import GradingResult, SubmissionPublic
from app.models.user import UserPublic
from app.services.grading_service import grade_submission

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

MAX_UPLOAD_BYTES = 512 * 1024  # 512 KB is plenty for an assignment source file


def _to_public(doc: dict) -> SubmissionPublic:
    return SubmissionPublic(
        id=str(doc["_id"]),
        assignment_id=doc["assignment_id"],
        student_username=doc["student_username"],
        filename=doc["filename"],
        submitted_at=doc["submitted_at"],
        result=GradingResult(**doc["result"]),
    )


@router.post("", response_model=SubmissionPublic, status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    background_tasks: BackgroundTasks,
    assignment_id: str,
    file: UploadFile = File(...),
    current_user: UserPublic = Depends(require_student),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        assignment = await db.assignments.find_one({"_id": ObjectId(assignment_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 512KB)")
    try:
        code = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 text source code")

    doc = {
        "assignment_id": assignment_id,
        "student_username": current_user.username,
        "filename": file.filename,
        "code": code,
        "submitted_at": datetime.now(timezone.utc),
        "result": {"status": "pending"},
    }
    res = await db.submissions.insert_one(doc)
    submission_id = str(res.inserted_id)

    background_tasks.add_task(_run_grading, db, submission_id)

    created = await db.submissions.find_one({"_id": res.inserted_id})
    return _to_public(created)


async def _run_grading(db: AsyncIOMotorDatabase, submission_id: str) -> None:
    await grade_submission(db, submission_id)


@router.get("/mine", response_model=list[SubmissionPublic])
async def my_submissions(
    assignment_id: str | None = None,
    current_user: UserPublic = Depends(require_student),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query: dict = {"student_username": current_user.username}
    if assignment_id:
        query["assignment_id"] = assignment_id
    cursor = db.submissions.find(query).sort("submitted_at", -1)
    return [_to_public(doc) async for doc in cursor]


@router.get("/by-assignment/{assignment_id}", response_model=list[SubmissionPublic])
async def submissions_for_assignment(
    assignment_id: str,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    cursor = db.submissions.find({"assignment_id": assignment_id}).sort("submitted_at", -1)
    return [_to_public(doc) async for doc in cursor]


@router.get("/{submission_id}", response_model=SubmissionPublic)
async def get_submission(
    submission_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        doc = await db.submissions.find_one({"_id": ObjectId(submission_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="Submission not found")
    if doc is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    if current_user.role == "student" and doc["student_username"] != current_user.username:
        raise HTTPException(status_code=403, detail="Not your submission")

    return _to_public(doc)
