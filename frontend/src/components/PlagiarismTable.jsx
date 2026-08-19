export default function PlagiarismTable({ report }) {
  if (!report) return null;

  if (!report.pairs?.length) {
    return <p className="text-sm text-ink-400">Not enough submissions yet to compare.</p>;
  }

  return (
    <div className="space-y-3">
      {report.pairs.map((p) => (
        <div
          key={`${p.submission_id_a}-${p.submission_id_b}`}
          className={`rounded-lg border p-4 ${p.flagged ? "border-fail/50 bg-fail/5" : "border-ink-100"}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-700">
              {p.student_a} <span className="text-ink-300">vs</span> {p.student_b}
            </span>
            <span className={`font-mono text-sm font-semibold ${p.flagged ? "text-fail" : "text-ink-400"}`}>
              {(p.similarity * 100).toFixed(1)}%
            </span>
          </div>
          {p.flagged && <p className="mt-1 text-xs font-medium uppercase tracking-wide text-fail">Flagged</p>}
          {p.ai_explanation && <p className="mt-2 text-sm text-ink-600">{p.ai_explanation}</p>}
        </div>
      ))}
    </div>
  );
}
