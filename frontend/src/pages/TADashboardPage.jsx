import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assignmentsApi, plagiarismApi } from "../api/endpoints";
import AssignmentCard from "../components/AssignmentCard";
import NavBar from "../components/NavBar";

export default function TADashboardPage() {
  const [assignments, setAssignments] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsApi
      .list()
      .then(({ data }) => setAssignments(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    plagiarismApi.storage().then(({ data }) => setStorage(data)).catch(() => {});
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

        {storage && (
          <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card">
            <div>
              <p className="font-mono text-lg font-semibold text-ink-700">{storage.submission_count}</p>
              <p className="text-xs text-ink-400">Submissions</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-ink-700">{storage.data_bytes.toLocaleString()}</p>
              <p className="text-xs text-ink-400">Source bytes</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-ink-700">{storage.plagiarism_case_count}</p>
              <p className="text-xs text-ink-400">Plagiarism cases</p>
            </div>
          </div>
        )}

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
