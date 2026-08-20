"""
Pairwise plagiarism detection and case management.

The similarity calculation remains deterministic: Porter stemming + TF-IDF +
cosine similarity. AI is advisory only and is never used to calculate the
similarity score or make the final academic-integrity decision.
"""
from __future__ import annotations

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.submission import PlagiarismPair, PlagiarismReport
from app.services import ai_service
from app.services.diff_service import unified_code_diff

DEFAULT_THRESHOLD = 0.8


def _preprocess(text: str) -> str:
    # Lazy imports/downloads keep the module importable even when NLTK data
    # has not been downloaded yet.
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem.porter import PorterStemmer
    from nltk.tokenize import word_tokenize

    for pkg in ("stopwords", "punkt", "punkt_tab"):
        try:
            nltk.data.find(
                f"tokenizers/{pkg}" if "punkt" in pkg else f"corpora/{pkg}"
            )
        except LookupError:
            try:
                nltk.download(pkg, quiet=True)
            except Exception:
                pass

    try:
        stop_words = set(stopwords.words("english"))
        stemmer = PorterStemmer()
        tokens = word_tokenize(text.lower())
        return " ".join(
            stemmer.stem(token)
            for token in tokens
            if token.isalpha() and token not in stop_words
        )
    except LookupError:
        return " ".join(word.lower() for word in text.split() if word.isalpha())


def pairwise_similarity(submissions: list[dict]) -> list[dict]:
    """Return every pairwise TF-IDF/cosine similarity score."""
    if len(submissions) < 2:
        return []

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    texts = [_preprocess(item["code"]) for item in submissions]
    if all(not text.strip() for text in texts):
        return []

    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform(texts)
    matrix = cosine_similarity(tfidf)

    pairs = []
    for i in range(len(submissions)):
        for j in range(i + 1, len(submissions)):
            pairs.append(
                {
                    "submission_id_a": submissions[i]["submission_id"],
                    "student_a": submissions[i]["student"],
                    "submission_id_b": submissions[j]["submission_id"],
                    "student_b": submissions[j]["student"],
                    "similarity": round(float(matrix[i][j]), 4),
                }
            )

    return sorted(pairs, key=lambda item: item["similarity"], reverse=True)


async def check_assignment_for_plagiarism(
    db: AsyncIOMotorDatabase,
    assignment_id: str,
    threshold: float = DEFAULT_THRESHOLD,
    explain_top_n: int = 0,
) -> PlagiarismReport:
    """
    Compare each student's latest submission.

    A similarity >= threshold creates/updates a flagged case. The optional
    Gemini explanation is generated only when explicitly requested by a TA.
    """
    cursor = db.submissions.find({"assignment_id": assignment_id}).sort(
        "submitted_at", -1
    )

    latest_by_student: dict[str, dict] = {}
    async for doc in cursor:
        student = doc["student_username"]
        latest_by_student.setdefault(
            student,
            {
                "submission_id": str(doc["_id"]),
                "student": student,
                "code": doc["code"],
                "filename": doc["filename"],
            },
        )

    submissions = list(latest_by_student.values())
    raw_pairs = pairwise_similarity(submissions)

    code_by_id = {item["submission_id"]: item["code"] for item in submissions}
    filename_by_id = {
        item["submission_id"]: item["filename"] for item in submissions
    }

    pairs: list[PlagiarismPair] = []
    explained = 0

    for pair in raw_pairs:
        flagged = pair["similarity"] >= threshold
        case_key = {
            "assignment_id": assignment_id,
            "submission_id_a": pair["submission_id_a"],
            "submission_id_b": pair["submission_id_b"],
        }

        case = await db.plagiarism_cases.find_one(case_key)

        if flagged:
            explanation = case.get("ai_explanation") if case else None

            if explanation is None and explained < explain_top_n:
                explanation = await ai_service.explain_plagiarism_pair(
                    code_a=code_by_id[pair["submission_id_a"]],
                    code_b=code_by_id[pair["submission_id_b"]],
                    similarity=pair["similarity"],
                )
                if explanation:
                    explained += 1

            diff = unified_code_diff(
                code_by_id[pair["submission_id_a"]],
                code_by_id[pair["submission_id_b"]],
                filename_a=(
                    f'{pair["student_a"]}/'
                    f'{filename_by_id[pair["submission_id_a"]]}'
                ),
                filename_b=(
                    f'{pair["student_b"]}/'
                    f'{filename_by_id[pair["submission_id_b"]]}'
                ),
            )

            updates = {
                "assignment_id": assignment_id,
                "student_a": pair["student_a"],
                "student_b": pair["student_b"],
                "similarity": pair["similarity"],
                "flagged": True,
                "diff": diff,
                "updated_at": datetime.now(timezone.utc),
            }
            if explanation:
                updates["ai_explanation"] = explanation

            await db.plagiarism_cases.update_one(
                case_key,
                {
                    "$set": updates,
                    "$setOnInsert": {
                        "created_at": datetime.now(timezone.utc),
                    },
                },
                upsert=True,
            )
            case = await db.plagiarism_cases.find_one(case_key)

        pairs.append(
            PlagiarismPair(
                submission_id_a=pair["submission_id_a"],
                student_a=pair["student_a"],
                submission_id_b=pair["submission_id_b"],
                student_b=pair["student_b"],
                similarity=pair["similarity"],
                flagged=flagged,
                ai_explanation=(
                    case.get("ai_explanation") if flagged and case else None
                ),
                case_id=str(case["_id"]) if flagged and case else None,
                diff=case.get("diff") if flagged and case else None,
                ta_decision=case.get("ta_decision") if flagged and case else None,
                ta_comment=case.get("ta_comment") if flagged and case else None,
                student_concern=(
                    case.get("student_concern") if flagged and case else None
                ),
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
