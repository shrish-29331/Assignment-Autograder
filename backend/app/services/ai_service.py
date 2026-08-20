from __future__ import annotations

import json
import logging

from google import genai

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

_client: genai.Client | None = None


def _get_client() -> genai.Client | None:
    global _client

    if not settings.gemini_api_key:
        return None

    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)

    return _client


async def generate_submission_feedback(
    *,
    code: str,
    language: str,
    tests_passed: int,
    tests_total: int,
    quality_metrics: list[dict],
) -> dict | None:
    """Generate advisory AI feedback for a submission."""

    if not settings.enable_ai_feedback:
        return None

    client = _get_client()

    if client is None:
        return None

    quality_summary = "\n".join(
        f"- {metric['name']}: "
        f"{metric['score']}/{metric['max_score']} "
        f"({metric['details'][:200]})"
        for metric in quality_metrics
    )

    prompt = f"""
You are an experienced teaching assistant reviewing a programming
assignment submission.

The deterministic autograder has already calculated the score.
Do NOT change or recompute the grade.

Language: {language}

Tests passed: {tests_passed}/{tests_total}

Static code-quality results:
{quality_summary}

Student code:
{language}
{code[:8000]}
Return ONLY valid JSON in this format:

{{
"summary": "2-3 sentence overview",
"strengths": [
"specific strength"
],
"improvements": [
"specific actionable improvement"
],
"risk_flags": [
"possible issue or edge case"
]
}}

Keep the feedback specific to this submission.
"""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )

        data = _parse_json(response.text)

        if data is None:
            return None

        data["model"] = settings.gemini_model

        return data

    except Exception:
        logger.exception("Gemini submission feedback failed")
        return None


async def explain_plagiarism_pair(
    *,
    code_a: str,
    code_b: str,
    similarity: float,
) -> str | None:
    """Explain a plagiarism similarity result using Gemini."""

    if not settings.enable_ai_feedback:
        return None

    client = _get_client()

    if client is None:
        return None

    prompt = f"""

You are assisting a teaching assistant reviewing a possible
plagiarism match between two programming submissions.

The similarity score below was calculated by the existing
deterministic TF-IDF + cosine-similarity algorithm.

Similarity score: {similarity:.2f}

Do NOT recompute or replace the similarity score.

Submission A:

{code_a[:5000]}

Submission B:

{code_b[:5000]}

Explain briefly:

What structural or textual similarities are present?
Could those similarities reasonably occur in a standard solution?
Does the pair appear unusually similar?

Remain neutral. Do not make a final academic-integrity determination.
A human should review the evidence.

Return plain text, 2-4 concise paragraphs.
"""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )

        return response.text.strip()

    except Exception:
        logger.exception("Gemini plagiarism explanation failed")
        return None


def _parse_json(text: str) -> dict | None:
    """Safely parse Gemini's JSON response."""

    if not text:
        return None

    text = text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

        if text.lower().startswith("json"):
            text = text[4:].strip()

    try:
        data = json.loads(text)

        if not isinstance(data, dict):
            return None

        data.setdefault("summary", "")
        data.setdefault("strengths", [])
        data.setdefault("improvements", [])
        data.setdefault("risk_flags", [])

        return data

    except json.JSONDecodeError:
        logger.warning("Could not parse Gemini JSON response")
        return None