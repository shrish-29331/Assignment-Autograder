from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class Language(str, Enum):
    python = "python"
    cpp = "cpp"
    c = "c"


class TestCase(BaseModel):
    input: str = ""
    expected_output: str
    hidden: bool = False  # hidden test cases are run but not shown in detail to students


class AssignmentCreate(BaseModel):
    title: str
    description: str
    language: Language
    deadline: datetime
    test_cases: list[TestCase] = Field(default_factory=list)
    # rubric weighting, must sum to 100
    test_case_weight: float = 75.0
    code_quality_weight: float = 25.0


class AssignmentPublic(BaseModel):
    id: str
    title: str
    description: str
    language: Language
    deadline: datetime
    test_case_weight: float
    code_quality_weight: float
    created_by: str
    created_at: datetime
    num_test_cases: int
    num_hidden_test_cases: int


class AssignmentDetail(AssignmentPublic):
    test_cases: list[TestCase]
