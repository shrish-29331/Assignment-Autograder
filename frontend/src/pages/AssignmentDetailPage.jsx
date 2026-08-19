import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { assignmentsApi, submissionsApi } from "../api/endpoints";
import NavBar from "../components/NavBar";
import PlagiarismPanel from "../components/PlagiarismPanel";
import StatusBadge from "../components/StatusBadge";
import SubmissionResultPanel from "../components/SubmissionResultPanel";
import SubmitForm from "../components/SubmitForm";
import TestCaseTable from "../components/TestCaseTable";
import { useAuth } from "../context/AuthContext";

const POLL_INTERVAL_MS = 3000;

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pollRef = useRef(null);

  const fetchSubmissions = useCallback(async () => {
    const { data } = user.role === "student" ? await submissionsApi.mine(id) : await submissionsApi.byAssignment(id);
    setSubmissions(data);
    return data;
  }, [id, user.role]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: assignmentData } = await assignmentsApi.get(id);
        if (cancelled) return;
        setAssignment(assignmentData);
        const subs = await fetchSubmissions();
        if (!cancelled && subs.length) setSelectedId(subs[0].id);
      } catch {
        if (!cancelled) setError("Could not load this assignment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, fetchSubmissions]);

  // Poll while any submission is still being graded, so scores/AI feedback
  // appear without the user needing to manually refresh.
  useEffect(() => {
    const hasPending = submissions.some((s) => ["pending", "grading"].includes(s.result.status));
    if (!hasPending) return undefined;

    pollRef.current = setInterval(async () => {
      await fetchSubmissions();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [submissions, fetchSubmissions]);

  const handleSubmitted = (newSubmission) => {
    setSubmissions((prev) => [newSubmission, ...prev]);
    setSelectedId(newSubmission.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <p className="p-10 text-sm text-ink-300">Loading&hellip;</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <p className="p-10 text-sm text-fail">{error || "Assignment not found."}</p>
      </div>
    );
  }

  const selectedSubmission = submissions.find((s) => s.id === selectedId);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink-700">{assignment.title}</h1>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-500">{assignment.description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-ink-100 px-3 py-1 font-mono text-xs uppercase text-ink-500">
              {assignment.language}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-400">
            <span>Due {new Date(assignment.deadline).toLocaleString()}</span>
            <span>
              Rubric: {assignment.test_case_weight}% tests / {assignment.code_quality_weight}% quality
            </span>
          </div>

          {assignment.test_cases?.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 font-display text-sm font-semibold text-ink-600">Sample test cases</h3>
              <TestCaseTable
                results={assignment.test_cases.map((tc) => ({
                  passed: true,
                  input: tc.input,
                  expected_output: tc.expected_output,
                  actual_output: tc.expected_output,
                  hidden: tc.hidden,
                }))}
              />
              {assignment.num_hidden_test_cases > 0 && (
                <p className="mt-2 text-xs text-ink-300">
                  Plus {assignment.num_hidden_test_cases} hidden test case
                  {assignment.num_hidden_test_cases === 1 ? "" : "s"} used for grading only.
                </p>
              )}
            </div>
          )}
        </div>

        {user.role === "student" ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-400">
                  No submissions yet &mdash; submit your solution to get graded.
                </div>
              ) : (
                submissions.map((s) => <SubmissionResultPanel key={s.id} submission={s} />)
              )}
            </div>
            <div>
              <SubmitForm assignment={assignment} onSubmitted={handleSubmitted} />
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
                <h3 className="font-display text-sm font-semibold text-ink-700">
                  Submissions ({submissions.length})
                </h3>
                <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
                  {submissions.length === 0 && <p className="text-xs text-ink-300">No submissions yet.</p>}
                  {submissions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        s.id === selectedId ? "bg-marigold-light/30" : "hover:bg-paper-dim"
                      }`}
                    >
                      <span className="truncate">{s.student_username}</span>
                      <span className="ml-2 flex items-center gap-2">
                        {s.result.status === "graded" && (
                          <span className="font-mono text-xs text-ink-400">{Math.round(s.result.total_score)}</span>
                        )}
                        <StatusBadge status={s.result.status} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <PlagiarismPanel assignmentId={id} />
            </div>

            <div>
              {selectedSubmission ? (
                <SubmissionResultPanel submission={selectedSubmission} />
              ) : (
                <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-400">
                  Select a submission on the left to see its results.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
