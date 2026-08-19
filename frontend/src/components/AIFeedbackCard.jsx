export default function AIFeedbackCard({ feedback }) {
  if (!feedback) {
    return (
      <div className="rounded-lg border border-dashed border-ink-200 p-4 text-sm text-ink-400">
        AI feedback is not available for this submission (either disabled by the instructor, or the
        request failed). The deterministic test + quality score above is unaffected.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-marigold/40 bg-marigold-light/10 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold text-ink-700">AI Feedback</h4>
        <span className="font-mono text-[11px] text-ink-400">{feedback.model}</span>
      </div>
      <p className="mt-2 text-sm text-ink-600">{feedback.summary}</p>

      {feedback.strengths?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-pass">Strengths</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-600">
            {feedback.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-marigold-dark">To improve</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-600">
            {feedback.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.risk_flags?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fail">Worth double-checking</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-600">
            {feedback.risk_flags.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-ink-300">
        AI-generated, advisory only — it does not change the computed score above.
      </p>
    </div>
  );
}
