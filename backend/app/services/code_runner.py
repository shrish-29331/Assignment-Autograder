"""
Runs untrusted student code against test cases.

SECURITY NOTE
-------------
The original project called `subprocess.run(['python', file], ...)` /
compiled and ran C++/C directly on the host with no isolation at all —
any submitted code could read/write files, open sockets, fork-bomb, or
otherwise do whatever the grading server's OS user could do. That is a
remote-code-execution hole.

This module is a meaningful improvement (per-run temp dir, CPU/memory/
wall-clock limits, stripped environment, no network-disabling library
available in this sandbox, no shell=True) but it still runs code as a
subprocess on the same machine. For a real production deployment you
should run each submission inside an ephemeral, network-disabled
container/microVM (e.g. Docker with --network=none --pids-limit
--memory, gVisor, Firecracker, or a hosted judge like Judge0/Piston).
The hooks below (`run_in_sandbox`) are written so swapping in a
container-based executor later is a localized change.
"""
from __future__ import annotations

import os
import resource
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.core.config import get_settings
from app.models.assignment import Language

settings = get_settings()


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    returncode: int
    timed_out: bool


def _limit_resources(memory_mb: int) -> None:
    """Applied in the child process via preexec_fn to cap memory + block core dumps."""

    def _setter() -> None:
        mem_bytes = memory_mb * 1024 * 1024
        try:
            resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
        except (ValueError, resource.error):
            # Some sandboxes / macOS disallow RLIMIT_AS; fail open rather than crash grading.
            pass

    return _setter


def _clean_env() -> dict[str, str]:
    return {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": "/tmp"}


def _run_subprocess(cmd: list[str], cwd: Path, stdin_text: str) -> ExecutionResult:
    timeout = settings.code_exec_timeout_seconds
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            input=stdin_text,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_clean_env(),
            preexec_fn=_limit_resources(settings.code_exec_memory_limit_mb) if os.name == "posix" else None,
        )
        return ExecutionResult(stdout=proc.stdout, stderr=proc.stderr, returncode=proc.returncode, timed_out=False)
    except subprocess.TimeoutExpired as exc:
        return ExecutionResult(
            stdout=exc.stdout or "",
            stderr=(exc.stderr or "") + f"\n[Execution timed out after {timeout}s]",
            returncode=-1,
            timed_out=True,
        )


def compile_code(code: str, language: Language, workdir: Path) -> tuple[bool, str, Path]:
    """Writes source to disk and compiles if needed. Returns (ok, error_message, executable_or_source_path)."""
    if language == Language.python:
        src = workdir / "submission.py"
        src.write_text(code)
        return True, "", src

    if language == Language.cpp:
        src = workdir / "submission.cpp"
        binary = workdir / "submission_bin"
        src.write_text(code)
        proc = subprocess.run(
            ["g++", "-O2", "-std=c++17", str(src), "-o", str(binary)],
            capture_output=True,
            text=True,
            timeout=20,
        )
        if proc.returncode != 0:
            return False, proc.stderr, binary
        return True, "", binary

    if language == Language.c:
        src = workdir / "submission.c"
        binary = workdir / "submission_bin"
        src.write_text(code)
        proc = subprocess.run(
            ["gcc", "-O2", str(src), "-o", str(binary)],
            capture_output=True,
            text=True,
            timeout=20,
        )
        if proc.returncode != 0:
            return False, proc.stderr, binary
        return True, "", binary

    raise ValueError(f"Unsupported language: {language}")


def run_test_case(language: Language, exe_path: Path, workdir: Path, stdin_text: str) -> ExecutionResult:
    if language == Language.python:
        cmd = ["python3", str(exe_path)]
    else:
        cmd = [str(exe_path)]
    return _run_subprocess(cmd, workdir, stdin_text)


def grade_test_cases(code: str, language: Language, test_cases: list[dict]) -> dict:
    """
    Compiles (if needed) once, then runs every test case against the same
    binary/script. Returns a dict with pass count and per-case results,
    matching app.models.submission.TestCaseResult shape.
    """
    with tempfile.TemporaryDirectory(prefix="autograder_") as tmp:
        workdir = Path(tmp)
        ok, compile_error, exe_path = compile_code(code, language, workdir)

        if not ok:
            return {
                "compile_error": compile_error,
                "passed": 0,
                "total": len(test_cases),
                "results": [
                    {
                        "passed": False,
                        "input": tc["input"],
                        "expected_output": tc["expected_output"],
                        "actual_output": "",
                        "hidden": tc.get("hidden", False),
                        "error": "Compilation failed",
                    }
                    for tc in test_cases
                ],
            }

        results = []
        passed = 0
        for tc in test_cases:
            exec_result = run_test_case(language, exe_path, workdir, tc["input"])
            actual = exec_result.stdout.strip()
            expected = tc["expected_output"].strip()
            is_pass = actual == expected and exec_result.returncode == 0
            if is_pass:
                passed += 1
            results.append(
                {
                    "passed": is_pass,
                    "input": tc["input"],
                    "expected_output": tc["expected_output"],
                    "actual_output": actual if not tc.get("hidden") else ("<hidden>" if not is_pass else actual),
                    "hidden": tc.get("hidden", False),
                    "error": exec_result.stderr.strip() if exec_result.stderr and not is_pass else None,
                }
            )

        return {"compile_error": None, "passed": passed, "total": len(test_cases), "results": results}
