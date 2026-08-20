import { useState } from "react";
import { plagiarismApi } from "../api/endpoints";

export default function PlagiarismTable({ report, onChanged }) {
  const [comments, setComments] = useState({});
  const [savingCase, setSavingCase] = useState(null);

  const pairs = report?.pairs || [];

  if (!pairs.length) {
    return <p className="text-sm text-ink-400">No flagged pairs.</p>;
  }

  const decide = async (pair, decision) => {
    if (!pair.case_id) return;

    setSavingCase(pair.case_id);

    try {
      await plagiarismApi.decide(pair.case_id, {
        decision,
        comment: comments[pair.case_id] ?? pair.ta_comment ?? null,
      });

      await onChanged?.();
    } finally {
      setSavingCase(null);
    }
  };

  return (
    <div className="space-y-4">
      {pairs.map((pair) => (
        <article
          key={pair.case_id || `${pair.submission_id_a}-${pair.submission_id_b}`}
          className="overflow-hidden rounded-xl border border-fail/30 bg-fail/5"
        >
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-700">
                  {pair.student_a}
                  <span className="mx-2 text-ink-300">vs</span>
                  {pair.student_b}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Both students' latest submissions for this assignment
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-lg font-semibold text-fail">
                  {(pair.similarity * 100).toFixed(1)}%
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-fail">
                  Automatically flagged
                </p>
              </div>
            </div>

            {pair.ta_decision && (
              <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs">
                <span className="font-semibold">TA decision: </span>
                {pair.ta_decision === "plag"
                  ? "Plagiarism"
                  : "Not plagiarism"}
              </div>
            )}

            {pair.ai_explanation && (
              <div className="mt-3 rounded-lg border border-ink-100 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Gemini advisory explanation
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-600">
                  {pair.ai_explanation}
                </p>
              </div>
            )}

            {/* Always show the code diff instead of hiding it behind a button. */}
            <div className="mt-3 rounded-lg border border-ink-100 bg-white">
              <div className="border-b border-ink-100 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Code diff
                </p>
              </div>

              {pair.diff ? (
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap border-t border-ink-100 bg-ink-700 p-4 font-mono text-xs leading-5 text-paper">
                  {pair.diff}
                </pre>
              ) : (
                <div className="p-4">
                  <p className="text-sm font-medium text-ink-500">
                    Code diff is not available for this case.
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    The plagiarism similarity was detected, but the backend
                    did not return the compared source diff.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-ink-100 pt-4">
              <label
                className="text-xs font-semibold text-ink-500"
                htmlFor={`comment-${pair.case_id}`}
              >
                TA review comment
              </label>

              <textarea
                id={`comment-${pair.case_id}`}
                value={comments[pair.case_id] ?? pair.ta_comment ?? ""}
                onChange={(event) =>
                  setComments((current) => ({
                    ...current,
                    [pair.case_id]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Explain why you marked this case as plagiarism or not plagiarism."
                className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700"
              />

              {pair.student_concern && (
                <div className="mt-3 rounded-lg bg-marigold-light/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Student concern
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">
                    {pair.student_concern}
                  </p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingCase === pair.case_id}
                  onClick={() => decide(pair, "plag")}
                  className="rounded-md bg-fail px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingCase === pair.case_id
                    ? "Saving..."
                    : "Mark as plagiarism"}
                </button>

                <button
                  type="button"
                  disabled={savingCase === pair.case_id}
                  onClick={() => decide(pair, "unplag")}
                  className="rounded-md border border-pass px-3 py-2 text-xs font-medium text-pass hover:bg-pass/10 disabled:opacity-50"
                >
                  Mark as not plagiarism
                </button>
              </div>

              {pair.ta_comment && (
                <p className="mt-2 text-xs text-ink-400">
                  Saved comment will be visible to the student.
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}