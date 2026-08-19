// The signature visual element of the app: a rubber-stamp-style badge that
// echoes a teacher's grading pen. Used anywhere a final score is shown.
export default function ScoreStamp({ score, max = 100, size = "md" }) {
  const pct = max > 0 ? score / max : 0;
  const tone = pct >= 0.8 ? "pass" : pct >= 0.5 ? "marigold" : "fail";

  const toneClasses = {
    pass: "border-pass text-pass",
    marigold: "border-marigold-dark text-marigold-dark",
    fail: "border-fail text-fail",
  }[tone];

  const sizeClasses = {
    sm: "w-14 h-14 text-sm",
    md: "w-20 h-20 text-lg",
    lg: "w-28 h-28 text-2xl",
  }[size];

  return (
    <div
      className={`shrink-0 select-none rounded-full border-[3px] ${toneClasses} ${sizeClasses} flex flex-col items-center justify-center font-display font-semibold -rotate-6`}
      style={{ borderStyle: "double", borderWidth: "4px" }}
      aria-label={`Score: ${score} out of ${max}`}
    >
      <span className="leading-none">{Math.round(score)}</span>
      <span className="text-[0.55em] font-sans uppercase tracking-wider opacity-70">/ {max}</span>
    </div>
  );
}
