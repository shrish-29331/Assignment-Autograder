import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function AssignmentCard({ assignment }) {
  const deadline = new Date(assignment.deadline);
  const isPast = deadline < new Date();

  return (
    <Link
      to={`/assignments/${assignment.id}`}
      className="block rounded-xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-700">{assignment.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink-400">{assignment.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 font-mono text-[11px] uppercase text-ink-500">
          {assignment.language}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
        <span className={isPast ? "text-fail" : ""}>
          {isPast ? "Closed " : "Due "}
          {format(deadline, "MMM d, yyyy 'at' h:mm a")}
        </span>
        <span>{assignment.num_test_cases} test case{assignment.num_test_cases === 1 ? "" : "s"}</span>
      </div>
    </Link>
  );
}
