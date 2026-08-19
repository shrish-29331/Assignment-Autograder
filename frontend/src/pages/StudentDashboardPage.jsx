import { useEffect, useState } from "react";
import { assignmentsApi } from "../api/endpoints";
import AssignmentCard from "../components/AssignmentCard";
import NavBar from "../components/NavBar";

export default function StudentDashboardPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    assignmentsApi
      .list()
      .then(({ data }) => setAssignments(data))
      .catch(() => setError("Could not load assignments."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink-700">Your assignments</h1>
        <p className="mt-1 text-sm text-ink-400">Submit your code and get instant, detailed feedback.</p>

        {loading && <p className="mt-8 text-sm text-ink-300">Loading&hellip;</p>}
        {error && <p className="mt-8 text-sm text-fail">{error}</p>}

        {!loading && !error && assignments.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-ink-200 p-10 text-center">
            <p className="text-ink-400">No assignments have been posted yet. Check back soon.</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      </main>
    </div>
  );
}
