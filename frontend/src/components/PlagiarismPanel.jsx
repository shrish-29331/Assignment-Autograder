import { useEffect, useState } from "react";
import { plagiarismApi } from "../api/endpoints";
import PlagiarismTable from "./PlagiarismTable";

export default function PlagiarismPanel({ assignmentId }) {
  const [report, setReport] = useState(null);
  const [cases, setCases] = useState([]);
  const [threshold, setThreshold] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const loadCases = async () => {
    const { data } = await plagiarismApi.cases(assignmentId);
    setCases(data);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [latestResponse, casesResponse] = await Promise.all([
          plagiarismApi.latest(assignmentId),
          plagiarismApi.cases(assignmentId),
        ]);

        if (cancelled) return;
        setReport(latestResponse.data);
        setCases(casesResponse.data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || "Could not load plagiarism results.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const runCheck = async () => {
    setChecking(true);
    setError("");

    try {
      const { data } = await plagiarismApi.check(assignmentId, threshold);
      setReport(data);
      await loadCases();
    } catch (err) {
      setError(err.response?.data?.detail || "Plagiarism check failed.");
    } finally {
      setChecking(false);
    }
  };

  const displayReport = report || {
    assignment_id: assignmentId,
    threshold,
    pairs: cases,
  };

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-700">
            Plagiarism review
          </h3>
          <p className="mt-1 text-xs leading-5 text-ink-400">
            Automatic checks flag pairs at 80% or higher. TF-IDF + cosine
            similarity creates the flag; Gemini is advisory and does not
            decide plagiarism.
          </p>
        </div>
        {cases.length > 0 && (
          <span className="shrink-0 rounded-full bg-fail/10 px-2.5 py-1 text-xs font-semibold text-fail">
            {cases.length} flagged
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-xs text-ink-400" htmlFor={`threshold-${assignmentId}`}>
          Manual re-check threshold
        </label>
        <input
          id={`threshold-${assignmentId}`}
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value))}
          className="w-40"
        />
        <span className="font-mono text-xs text-ink-500">
          {Math.round(threshold * 100)}%
        </span>
        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="rounded-md bg-ink px-4 py-2 text-xs font-medium text-paper transition hover:bg-ink-500 disabled:opacity-50"
        >
          {checking ? "Analyzing..." : "Re-run plagiarism check + AI review"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-fail">{error}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-ink-300">Loading plagiarism results...</p>
      ) : cases.length ? (
        <div className="mt-5">
          <PlagiarismTable
            report={{ ...displayReport, pairs: cases }}
            onChanged={loadCases}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-ink-200 p-5">
          <p className="text-sm font-medium text-ink-600">
            No flagged pairs.
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Automatic checking runs after a submission is graded. You can also
            run a manual check above.
          </p>
        </div>
      )}
    </div>
  );
}
