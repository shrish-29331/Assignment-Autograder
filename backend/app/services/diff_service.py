import difflib


def unified_code_diff(
    code_a: str,
    code_b: str,
    filename_a: str = "submission_a",
    filename_b: str = "submission_b",
) -> str:
    """Generate a useful diff, including an explicit identical-file result."""

    lines_a = code_a.splitlines(keepends=True)
    lines_b = code_b.splitlines(keepends=True)

    if code_a == code_b:
        return (
            f"FILES ARE IDENTICAL — 100% CODE MATCH\n\n"
            f"--- {filename_a} ---\n"
            f"{code_a}\n\n"
            f"--- {filename_b} ---\n"
            f"{code_b}\n"
        )

    diff = "".join(
        difflib.unified_diff(
            lines_a,
            lines_b,
            fromfile=filename_a,
            tofile=filename_b,
            lineterm="",
        )
    )

    return diff or "No textual differences found."