export default function QualityMetricsList({ metrics }) {
  if (!metrics?.length) return null;

  return (
    <div className="space-y-3">
      {metrics.map((m) => {
        const pct = m.max_score > 0 ? (m.score / m.max_score) * 100 : 0;
        return (
          <div key={m.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-600">{m.name}</span>
              <span className="font-mono text-ink-400">
                {m.score}/{m.max_score}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-marigold transition-[width]"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-400 whitespace-pre-wrap">{m.details}</p>
          </div>
        );
      })}
    </div>
  );
}
