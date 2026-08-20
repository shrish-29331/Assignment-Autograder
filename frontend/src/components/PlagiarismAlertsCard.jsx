import { useState } from "react";
import { plagiarismApi } from "../api/endpoints";

export default function PlagiarismAlertsCard({ cases, username, onUpdated }) {
  const [concerns, setConcerns] = useState({});
  const [submittingCase, setSubmittingCase] = useState(null);
  const [errors, setErrors] = useState({});

  if (!cases?.length) return null;

  const submitConcern = async (caseId) => {
    const value = (concerns[caseId] || "").trim();
    if (!value) return;

    setSubmittingCase(caseId);
    setErrors((current) => ({ ...current, [caseId]: "" }));

    try {
      const { data } = await plagiarismApi.contest(caseId, {
        concern: value,
      });

      setConcerns((current) => ({ ...current, [caseId]: "" }));
      onUpdated?.(data);
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [caseId]:
          err.response?.data?.detail || "Could not submit your concern.",
      }));
    } finally {
      setSubmittingCase(null);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-fail/30 bg-fail/5 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-fail text-xs font-bold text-white"
          aria-hidden="true"
        >
          !
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-ink-700">
            Similarity detected
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Your latest submission has been automatically flagged because it
            matches another student's latest submission by at least 80%.
            Similarity is evidence for review, not a final plagiarism decision.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {cases.map((item) => {
          const otherStudent =
            item.student_a === username ? item.student_b : item.student_a;
          const submittedConcern = Boolean(item.student_concern);
          const decided = Boolean(item.ta_decision);

          return (
            <div
              key={item.case_id}
              className="rounded-lg border border-fail/20 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-700">
                    Matching submission: {otherStudent}
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-fail">
                    {(item.similarity * 100).toFixed(1)}% similarity
                  </p>
                </div>

                <span className="rounded-full bg-fail/10 px-3 py-1 text-xs font-semibold text-fail">
                  {decided ? "TA reviewed" : "Awaiting TA review"}
                </span>
              </div>

              {item.ta_decision && (
                <p className="mt-4 text-sm font-medium text-ink-600">
                  TA decision:{" "}
                  {item.ta_decision === "plag"
                    ? "Plagiarism"
                    : "Not plagiarism"}
                </p>
              )}

              {item.ta_comment && (
                <div className="mt-3 rounded-md bg-marigold-light/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    TA comment
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">
                    {item.ta_comment}
                  </p>
                </div>
              )}

              {submittedConcern ? (
                <div className="mt-4 rounded-md bg-paper-dim p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Your submitted concern
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">
                    {item.student_concern}
                  </p>
                  {!decided && (
                    <p className="mt-2 text-xs text-ink-400">
                      Your concern has been sent to the TA and is awaiting
                      review.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-ink-100 bg-paper-dim p-4">
                  <p className="text-sm font-semibold text-ink-700">
                    Think this flag is incorrect?
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Write a concern explaining your side. Your message will
                    appear on the TA dashboard for this plagiarism case.
                  </p>

                  <label
                    className="mt-3 block text-xs font-semibold text-ink-500"
                    htmlFor={`concern-${item.case_id}`}
                  >
                    Contest / write a concern
                  </label>

                  <textarea
                    id={`concern-${item.case_id}`}
                    value={concerns[item.case_id] || ""}
                    onChange={(event) =>
                      setConcerns((current) => ({
                        ...current,
                        [item.case_id]: event.target.value,
                      }))
                    }
                    placeholder="For example: I used the starter code provided with the assignment."
                    rows={4}
                    disabled={submittingCase === item.case_id}
                    className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
                  />

                  {errors[item.case_id] && (
                    <p className="mt-2 text-sm text-fail">
                      {errors[item.case_id]}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      submittingCase === item.case_id ||
                      !(concerns[item.case_id] || "").trim()
                    }
                    onClick={() => submitConcern(item.case_id)}
                    className="mt-2 rounded-md bg-marigold px-3 py-2 text-xs font-medium text-ink-700 hover:bg-marigold-dark disabled:opacity-50"
                  >
                    {submittingCase === item.case_id
                      ? "Sending..."
                      : "Submit concern to TA"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}