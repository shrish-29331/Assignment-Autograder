from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SubmissionStatus(str, Enum):
    pending = "pending"
    grading = "grading"
    graded = "graded"
    error = "error"


class TestCaseResult(BaseModel):
    passed: bool
    input: str
    expected_output: str
    actual_output: str
    hidden: bool = False
    error: str | None = None


class QualityMetric(BaseModel):
    name: str
    score: float
    max_score: float
    details: str


class AIFeedback(BaseModel):
    summary: str
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    model: str = "unknown"


class GradingResult(BaseModel):
    status: SubmissionStatus
    test_cases_passed: int = 0
    test_cases_total: int = 0
    test_case_results: list[TestCaseResult] = Field(default_factory=list)
    quality_metrics: list[QualityMetric] = Field(default_factory=list)
    test_case_score: float = 0.0
    quality_score: float = 0.0
    total_score: float = 0.0
    is_late: bool = False
    ai_feedback: AIFeedback | None = None
    compile_error: str | None = None


class SubmissionPublic(BaseModel):
    id: str
    assignment_id: str
    student_username: str
    filename: str
    submitted_at: datetime
    result: GradingResult


class PlagiarismPair(BaseModel):
    submission_id_a: str
    student_a: str
    submission_id_b: str
    student_b: str
    similarity: float
    flagged: bool
    ai_explanation: str | None = None
    case_id: str | None = None
    diff: str | None = None
    ta_decision: str | None = None
    ta_comment: str | None = None
    student_concern: str | None = None


class PlagiarismReport(BaseModel):
    assignment_id: str
    generated_at: datetime
    threshold: float
    pairs: list[PlagiarismPair]
