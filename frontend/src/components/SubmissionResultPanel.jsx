import AIFeedbackCard from "./AIFeedbackCard";
import QualityMetricsList from "./QualityMetricsList";
import ScoreStamp from "./ScoreStamp";
import StatusBadge from "./StatusBadge";
import TestCaseTable from "./TestCaseTable";

export default function SubmissionResultPanel({ submission }) {
  const { result } = submission;

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-ink-300">{submission.filename}</p>
          <p className="text-sm text-ink-400">
            Submitted {new Date(submission.submitted_at).toLocaleString()}
            {result.is_late && <span className="ml-2 font-medium text-fail">Late</span>}
          </p>
          <div className="mt-2">
            <StatusBadge status={result.status} />
          </div>
        </div>
        {result.status === "graded" && <ScoreStamp score={result.total_score} max={100} />}
      </div>

      {result.status === "pending" || result.status === "grading" ? (
        <p className="mt-4 text-sm text-ink-400">
          Your submission is being compiled and graded. This page will update automatically &mdash; feel free to
          refresh in a few seconds.
        </p>
      ) : null}

      {result.compile_error && (
        <div className="mt-4 rounded-lg border border-fail/40 bg-fail/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fail">Compile error</p>
          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-ink-600">{result.compile_error}</pre>
        </div>
      )}

      {result.status === "graded" && !result.compile_error && (
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="font-display text-base font-semibold text-ink-700">
              Test cases &mdash; {result.test_cases_passed}/{result.test_cases_total} passed
              <span className="ml-2 font-mono text-xs font-normal text-ink-300">({result.test_case_score.toFixed(1)} pts)</span>
            </h4>
            <div className="mt-2">
              <TestCaseTable results={result.test_case_results} />
            </div>
          </div>

          <div>
            <h4 className="font-display text-base font-semibold text-ink-700">
              Code quality
              <span className="ml-2 font-mono text-xs font-normal text-ink-300">({result.quality_score.toFixed(1)} pts)</span>
            </h4>
            <div className="mt-2">
              <QualityMetricsList metrics={result.quality_metrics} />
            </div>
          </div>
        </div>
      )}

      {result.status === "graded" && (
        <div className="mt-5">
          <AIFeedbackCard feedback={result.ai_feedback} />
        </div>
      )}
    </div>
  );
}
