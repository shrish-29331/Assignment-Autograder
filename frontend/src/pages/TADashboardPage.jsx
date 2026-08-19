import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assignmentsApi } from "../api/endpoints";
import AssignmentCard from "../components/AssignmentCard";
import NavBar from "../components/NavBar";

export default function TADashboardPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsApi
      .list()
      .then(({ data }) => setAssignments(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-700">Your assignments</h1>
            <p className="mt-1 text-sm text-ink-400">Create assignments, review submissions, and check for plagiarism.</p>
          </div>
          <Link
            to="/assignments/new"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink-500"
          >
            + New assignment
          </Link>
        </div>

        {loading && <p className="mt-8 text-sm text-ink-300">Loading&hellip;</p>}

        {!loading && assignments.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-ink-200 p-10 text-center">
            <p className="text-ink-400">You haven&rsquo;t created any assignments yet.</p>
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
