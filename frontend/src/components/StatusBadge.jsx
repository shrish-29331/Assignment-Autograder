const STYLES = {
  pending: "bg-ink-100 text-ink-500",
  grading: "bg-marigold-light/40 text-marigold-dark animate-pulse",
  graded: "bg-pass/15 text-pass",
  error: "bg-fail/15 text-fail",
};

const LABELS = {
  pending: "Queued",
  grading: "Grading\u2026",
  graded: "Graded",
  error: "Error",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] || STYLES.pending}`}>
      {LABELS[status] || status}
    </span>
  );
}
