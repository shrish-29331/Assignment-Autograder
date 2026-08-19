"""
Static code-quality heuristics.

This is a cleaned-up, importable version of the logic that used to live in
the original `auto_evaluate.py` (which mixed printing, global file writes,
and grading in one giant script). Behaviour is preserved conceptually:

  * Python  -> scored via `pylint`
  * C/C++   -> five custom heuristics: commenting ratio, expression
               complexity, indentation consistency, line repetition,
               variable naming/scoping

Each check returns a `QualityMetric`-shaped dict: {name, score, max_score,
details}. Every check is capped at 5 points; the five C/C++ checks sum to
25, matching a python file's pylint-derived score out of 25 (pylint's 0-10
score * 2.5).
"""
from __future__ import annotations

import math
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path


def _metric(name: str, score: float, max_score: float, details: str) -> dict:
    return {"name": name, "score": round(max(0.0, min(score, max_score)), 2), "max_score": max_score, "details": details}


# ---------------------------------------------------------------------------
# Python: delegate to pylint
# ---------------------------------------------------------------------------
def analyze_python(code: str) -> list[dict]:
    with tempfile.TemporaryDirectory(prefix="quality_") as tmp:
        path = Path(tmp) / "submission.py"
        path.write_text(code)
        try:
            proc = subprocess.run(
                ["pylint", "--score=y", "--exit-zero", str(path)],
                capture_output=True,
                text=True,
                timeout=15,
            )
            output = proc.stdout
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return [_metric("Code Quality (pylint unavailable)", 12.5, 25.0, "pylint is not installed on this server; assigned a neutral score.")]

    match = re.search(r"rated at (-?\d+\.\d+)/10", output)
    pylint_score = float(match.group(1)) if match else 5.0
    pylint_score = max(0.0, pylint_score)  # pylint can go negative; floor at 0
    scaled = pylint_score * 2.5  # 10 -> 25
    return [_metric("Pylint Score", scaled, 25.0, output.strip()[-1500:] or "No pylint output.")]


# ---------------------------------------------------------------------------
# C / C++ heuristics
# ---------------------------------------------------------------------------
def _strip_comments_lines(code: str) -> list[str]:
    lines = []
    in_block = False
    for line in code.splitlines():
        if "/*" in line:
            in_block = True
            continue
        if "*/" in line:
            in_block = False
            continue
        if not in_block:
            lines.append(line.split("//")[0].strip())
    return lines


def check_commenting(code: str) -> dict:
    lines = code.splitlines()
    codes = comments = 0
    in_block = False
    for line in lines:
        if "/*" in line:
            in_block = True
        if "*/" in line:
            in_block = False
            comments += 1
        if "//" in line and not in_block:
            comments += 1
        if not in_block and line.strip() and not line.strip().startswith("//"):
            codes += 1
    codes = max(codes, 1)
    ratio = comments * 100 / codes

    if ratio < 6:
        feedback, pct = "Very few to no comments present; comment your code more thoroughly.", 25
    elif ratio < 12:
        feedback, pct = "A few comments present, but more are needed for full credit.", 50
    elif ratio < 18:
        feedback, pct = "Some comments present, but more are needed for full credit.", 75
    elif ratio < 50:
        feedback, pct = "A reasonable number of comments.", 100
    else:
        feedback, pct = "More heavily commented than necessary; can impede readability.", 75

    score = (pct / 100) * 5
    return _metric("Commenting", score, 5.0, f"Comment-to-code ratio: {ratio:.1f}%. {feedback}")


def check_expressions(code: str) -> dict:
    lines = _strip_comments_lines(code)
    compounds = constructs = long_lines = 0
    for line in lines:
        compounds += line.count("&&") + line.count("||")
        if "else if" in line or "else" in line or "while" in line or "for" in line:
            constructs += 1
            compounds += 1
            if len(line) > 50:
                long_lines += 1

    if compounds == 0 or constructs == 0:
        return _metric("Expression Complexity", 5.0, 5.0, "No conditional constructs found to analyze.")

    constructs_to_compounds = constructs / float(compounds)
    long_ratio = (0.6 * long_lines) / float(constructs)
    ratio = 100 * (0.5 * long_ratio + 0.5 * (1 - constructs_to_compounds))

    if ratio < 15:
        feedback, pct = "Expressions are reasonably simple.", 100
    elif ratio < 30:
        feedback, pct = "Some unnecessarily complex/long expressions.", 75
    elif ratio < 50:
        feedback, pct = "Many unnecessarily complex/long expressions; readability likely impaired.", 50
    else:
        feedback, pct = "Too many complex/long expressions; readability impaired.", 25

    score = pct / 20
    return _metric("Expression Complexity", score, 5.0, f"Complexity rate: {ratio:.1f}%. {feedback}")


def check_repetition(code: str) -> dict:
    lines = _strip_comments_lines(code)
    content = [l.split("//")[0].strip() for l in lines if l.strip() and len(l.strip()) > 22]
    total = max(len(content), 1)
    unique = list(set(content))
    duplicates = total - len(unique)

    unique.sort()
    similar = 0
    i, j = 0, 0
    while i < len(unique) and j < len(unique) - 1:
        j += 1
        if len(unique[i]) > 30 and SequenceMatcher(None, unique[i], unique[j]).ratio() > 0.9:
            similar += 1
            i -= 1
        else:
            i = j - 1
        i += 1

    ratio = 100 * (0.8 * duplicates + 0.65 * similar) / float(total)
    if ratio < 20:
        feedback, pct = "Very little repetition.", 100
    elif ratio < 40:
        feedback, pct = "Some repetition; consider extracting common logic into functions.", 75
    elif ratio < 65:
        feedback, pct = "A fair amount of repetition; extract common logic into functions.", 50
    else:
        feedback, pct = "A lot of repetition; extract common logic into functions.", 25

    score = pct / 20
    return _metric("Repetition", score, 5.0, f"Repetition rate: {ratio:.1f}%. {feedback}")


def check_indentation(code: str) -> dict:
    lines = code.splitlines(keepends=True)
    indents = 0
    indent_samples: dict[int, list[str]] = {}
    for line in lines:
        indentation = line[: len(line) - len(line.lstrip())]
        if line.strip().startswith("}"):
            indents -= 1
        indent_samples.setdefault(indents, []).append(indentation)
        if "{" in line:
            indents += 1
        if "}" in line and not line.strip().startswith("}"):
            indents -= 1

    expected = {k: max(set(v), key=v.count) for k, v in indent_samples.items()}

    indents = 0
    wrong = 0
    total_lines = max(len(lines), 1)
    for line in lines:
        indentation = line[: len(line) - len(line.lstrip())]
        if line.strip().startswith("}"):
            indents -= 1
        if indentation != expected.get(indents, indentation):
            wrong += 1
        if "{" in line:
            indents += 1
        if "}" in line and not line.strip().startswith("}"):
            indents -= 1

    ratio = 100 * wrong / total_lines
    if ratio < 8:
        feedback, pct = "Indentation is consistent.", 100
    elif ratio < 20:
        feedback, pct = "A few indentation inconsistencies.", 75
    elif ratio < 35:
        feedback, pct = "Several indentation inconsistencies.", 50
    else:
        feedback, pct = "Many indentation inconsistencies.", 25

    score = pct / 20
    return _metric("Indentation", score, 5.0, f"Inconsistent indentation on {ratio:.1f}% of lines. {feedback}")


def check_variables(code: str) -> dict:
    lines = _strip_comments_lines(code)
    types = {"int", "double", "float", "bool", "char", "string"}
    var_total = var_short = for_total = for_scoped = 0
    for line in lines:
        parts = line.split(" ")
        if len(parts) > 1 and parts[0] in types:
            var_total += 1
            if len(parts[1]) < 3:
                var_short += 1
        if "for" in line:
            for_total += 1
            if "int" in line or "auto" in line or "decltype" in line:
                for_scoped += 1

    for_total = max(for_total, 1)
    var_total = max(var_total, 1)
    ratio = 100 * (0.5 * (for_total - for_scoped) / for_total + 0.5 * var_short / var_total)

    if ratio < 15:
        feedback, pct = "Naming and scoping look good.", 100
    elif ratio < 30:
        feedback, pct = "Several naming/scoping issues; use meaningful names and tight scoping.", 75
    elif ratio < 50:
        feedback, pct = "Multiple naming/scoping issues.", 50
    else:
        feedback, pct = "Many naming/scoping issues.", 25

    score = pct / 20
    return _metric("Variable Naming & Scoping", score, 5.0, f"Issue rate: {ratio:.1f}%. {feedback}")


def analyze_cpp(code: str) -> list[dict]:
    return [
        check_commenting(code),
        check_expressions(code),
        check_indentation(code),
        check_repetition(code),
        check_variables(code),
    ]


def analyze_code_quality(code: str, language: str) -> list[dict]:
    if language == "python":
        return analyze_python(code)
    return analyze_cpp(code)
