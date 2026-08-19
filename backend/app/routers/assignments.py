from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_db
from app.deps import get_current_user, require_ta
from app.models.assignment import AssignmentCreate, AssignmentDetail, AssignmentPublic
from app.models.user import UserPublic

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


def _to_public(doc: dict) -> AssignmentPublic:
    return AssignmentPublic(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc["description"],
        language=doc["language"],
        deadline=doc["deadline"],
        test_case_weight=doc["test_case_weight"],
        code_quality_weight=doc["code_quality_weight"],
        created_by=doc["created_by"],
        created_at=doc["created_at"],
        num_test_cases=len(doc.get("test_cases", [])),
        num_hidden_test_cases=sum(1 for tc in doc.get("test_cases", []) if tc.get("hidden")),
    )


@router.post("", response_model=AssignmentPublic, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    payload: AssignmentCreate,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if round(payload.test_case_weight + payload.code_quality_weight) != 100:
        raise HTTPException(status_code=400, detail="test_case_weight + code_quality_weight must total 100")

    doc = payload.model_dump()
    doc["test_cases"] = [tc.model_dump() for tc in payload.test_cases]
    doc["created_by"] = current_user.username
    doc["created_at"] = datetime.now(timezone.utc)

    res = await db.assignments.insert_one(doc)
    created = await db.assignments.find_one({"_id": res.inserted_id})
    return _to_public(created)


@router.get("", response_model=list[AssignmentPublic])
async def list_assignments(
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {"created_by": current_user.username} if current_user.role == "ta" else {}
    cursor = db.assignments.find(query).sort("created_at", -1)
    return [_to_public(doc) async for doc in cursor]


@router.get("/{assignment_id}", response_model=AssignmentDetail)
async def get_assignment(
    assignment_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        doc = await db.assignments.find_one({"_id": ObjectId(assignment_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if doc is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    public = _to_public(doc)
    test_cases = doc.get("test_cases", [])
    # Students only see non-hidden test cases in full detail
    if current_user.role == "student":
        test_cases = [tc for tc in test_cases if not tc.get("hidden")]

    return AssignmentDetail(**public.model_dump(), test_cases=test_cases)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    current_user: UserPublic = Depends(require_ta),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db.assignments.find_one({"_id": ObjectId(assignment_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if doc["created_by"] != current_user.username:
        raise HTTPException(status_code=403, detail="You did not create this assignment")

    await db.assignments.delete_one({"_id": ObjectId(assignment_id)})
    await db.submissions.delete_many({"assignment_id": assignment_id})
