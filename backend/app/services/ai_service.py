"""
AI-powered feedback, on top of (not instead of) the deterministic
test-case + static-analysis grading.

The original project explicitly advertised "No External APIs" and did all
scoring with hand-rolled heuristics. This service adds a Claude call that
reads the code + the deterministic results and produces qualitative,
human-readable feedback: what the student did well, what to improve, and
any correctness/design risks the heuristics wouldn't catch (e.g. an
off-by-one that happens to pass the sample tests, or a security smell).

Deterministic scoring (tests + static analysis) still decides the grade.
The AI output is explanatory/advisory only, is always labelled with the
model that produced it, and grading never blocks forever on it — any
failure/timeout just omits the AI section rather than failing the submission.
"""
from __future__ import annotations

import json
import logging

from anthropic import AsyncAnthropic, APIError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic | None:
    global _client
    if not settings.anthropic_api_key:
        return None
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


FEEDBACK_SYSTEM_PROMPT = """You are an experienced teaching assistant giving concise, constructive \
feedback on a student's code submission. You are given the source code, the \
deterministic test results, and static code-quality metrics that have ALREADY \
been computed -- do not recompute a score or contradict the pass/fail counts.

Respond with ONLY a JSON object (no markdown fences, no preamble) matching this \
exact schema:
{
  "summary": "2-3 sentence overview of the submission's quality",
  "strengths": ["short bullet", "..."],
  "improvements": ["short actionable bullet", "..."],
  "risk_flags": ["e.g. an edge case the tests don't cover, a possible off-by-one, a security smell -- omit if none"]
}
Keep each bullet under 20 words. Be specific to THIS code, not generic advice."""


async def generate_submission_feedback(
    *,
    code: str,
    language: str,
    tests_passed: int,
    tests_total: int,
    quality_metrics: list[dict],
) -> dict | None:
    client = _get_client()
    if client is None or not settings.enable_ai_feedback:
        return None

    quality_summary = "\n".join(f"- {m['name']}: {m['score']}/{m['max_score']} ({m['details'][:200]})" for m in quality_metrics)
    user_prompt = f"""Language: {language}
Test cases: {tests_passed}/{tests_total} passed

Static quality metrics already computed:
{quality_summary}

Source code:
```{language}
{code[:8000]}
```"""

    try:
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=700,
            system=FEEDBACK_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw_text = "".join(block.text for block in response.content if block.type == "text")
        parsed = _parse_json_block(raw_text)
        if parsed is None:
            return None
        parsed["model"] = settings.anthropic_model
        return parsed
    except APIError as exc:
        logger.warning("Anthropic API error while generating feedback: %s", exc)
        return None
    except Exception:  # noqa: BLE001 -- AI feedback is best-effort, never crash grading
        logger.exception("Unexpected error generating AI feedback")
        return None


PLAGIARISM_SYSTEM_PROMPT = """You are helping a teaching assistant understand why an automated \
similarity checker flagged two student code submissions. You are given both \
snippets and the computed similarity score. In 2-4 sentences, explain in plain \
language WHAT is similar (structure, variable names, comments, approach, or \
verbatim blocks) and give a brief, neutral read on whether this looks like \
coincidental similarity (e.g. both used the obvious standard approach) or \
closer copying. You are not making a final academic-integrity determination -- \
a human reviews that. Do not use markdown formatting."""


async def explain_plagiarism_pair(*, code_a: str, code_b: str, similarity: float) -> str | None:
    client = _get_client()
    if client is None or not settings.enable_ai_feedback:
        return None

    user_prompt = f"""Cosine similarity score: {similarity:.2f}

Submission A:
```
{code_a[:4000]}
```

Submission B:
```
{code_b[:4000]}
```"""

    try:
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=300,
            system=PLAGIARISM_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in response.content if block.type == "text").strip()
    except APIError as exc:
        logger.warning("Anthropic API error while explaining plagiarism pair: %s", exc)
        return None
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected error explaining plagiarism pair")
        return None


def _parse_json_block(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text)
        data.setdefault("strengths", [])
        data.setdefault("improvements", [])
        data.setdefault("risk_flags", [])
        return data
    except (json.JSONDecodeError, AttributeError):
        logger.warning("Could not parse AI feedback JSON: %s", text[:200])
        return None
