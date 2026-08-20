export default function AIFeedbackCard({ feedback }) {
  if (!feedback) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-paper-dim p-5 text-sm leading-6 text-ink-400">
        AI feedback is not available for this submission. The deterministic
        test and code-quality scores above are unaffected.
      </div>
    );
  }

  const sections = [
    {
      title: "Strengths",
      items: feedback.strengths,
      titleClass: "text-pass",
      dotClass: "bg-pass",
    },
    {
      title: "To improve",
      items: feedback.improvements,
      titleClass: "text-marigold-dark",
      dotClass: "bg-marigold-dark",
    },
    {
      title: "Worth double-checking",
      items: feedback.risk_flags,
      titleClass: "text-fail",
      dotClass: "bg-fail",
    },
  ];

  return (
    <div className="rounded-xl border border-marigold/40 bg-marigold-light/10 p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="font-display text-base font-semibold text-ink-700">
          AI Feedback
        </h4>

        <span className="self-start rounded-full bg-white/70 px-2.5 py-1 font-mono text-[10px] text-ink-400 sm:self-auto">
          {feedback.model}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm leading-6 text-ink-600">
          {feedback.summary}
        </p>
      </div>

      <div className="mt-5 space-y-5">
        {sections.map(
          ({ title, items, titleClass, dotClass }) =>
            items?.length > 0 && (
              <div key={title}>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${titleClass}`}
                >
                  {title}
                </p>

                <ul className="mt-2 space-y-2">
                  {items.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2.5 text-sm leading-6 text-ink-600"
                    >
                      <span
                        className={`mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
        )}
      </div>

      <div className="mt-6 border-t border-marigold/20 pt-3">
        <p className="text-[11px] leading-5 text-ink-300">
          AI-generated, advisory only — it does not change the computed score
          above.
        </p>
      </div>
    </div>
  );
}