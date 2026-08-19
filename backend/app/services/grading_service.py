"""
Orchestrates a full grading run for one submission:

  1. Run test cases in the sandbox (code_runner)
  2. Run static code-quality checks (code_quality)
  3. Weight + combine into a final score using the assignment's rubric
  4. Optionally ask Claude for qualitative feedback (ai_service)
  5. Persist the result on the submission document

Runs as a FastAPI BackgroundTask so the submit endpoint returns immediately
with status "pending" and the frontend polls (or re-fetches) for "graded".
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services import ai_service, code_quality, code_runner


async def grade_submission(db: AsyncIOMotorDatabase, submission_id: str) -> None:
    submission = await db.submissions.find_one({"_id": ObjectId(submission_id)})
    if submission is None:
        return

    assignment = await db.assignments.find_one({"_id": ObjectId(submission["assignment_id"])})
    if assignment is None:
        return

    await db.submissions.update_one({"_id": submission["_id"]}, {"$set": {"result.status": "grading"}})

    code = submission["code"]
    language = assignment["language"]
    test_cases = assignment.get("test_cases", [])

    test_result = code_runner.grade_test_cases(code, language, test_cases)
    quality_metrics = code_quality.analyze_code_quality(code, language)

    test_case_weight = assignment.get("test_case_weight", 75.0)
    quality_weight = assignment.get("code_quality_weight", 25.0)

    test_total = max(test_result["total"], 1)
    test_case_score = (test_result["passed"] / test_total) * test_case_weight if test_result["total"] else test_case_weight

    quality_raw_total = sum(m["score"] for m in quality_metrics)
    quality_raw_max = sum(m["max_score"] for m in quality_metrics) or 1
    quality_score = (quality_raw_total / quality_raw_max) * quality_weight

    total_score = round(test_case_score + quality_score, 2) if not test_result["compile_error"] else 0.0

    is_late = submission["submitted_at"] > assignment["deadline"]

    ai_feedback = None
    try:
        ai_feedback = await ai_service.generate_submission_feedback(
            code=code,
            language=language,
            tests_passed=test_result["passed"],
            tests_total=test_result["total"],
            quality_metrics=quality_metrics,
        )
    except Exception:  # noqa: BLE001 -- never let AI errors block a grade from posting
        ai_feedback = None

    result = {
        "status": "graded",
        "test_cases_passed": test_result["passed"],
        "test_cases_total": test_result["total"],
        "test_case_results": test_result["results"],
        "quality_metrics": quality_metrics,
        "test_case_score": round(test_case_score, 2),
        "quality_score": round(quality_score, 2),
        "total_score": total_score,
        "is_late": is_late,
        "ai_feedback": ai_feedback,
        "compile_error": test_result["compile_error"],
        "graded_at": datetime.now(timezone.utc),
    }

    await db.submissions.update_one({"_id": submission["_id"]}, {"$set": {"result": result}})
