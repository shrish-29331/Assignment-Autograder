import { useState } from "react";
import { plagiarismApi } from "../api/endpoints";
import PlagiarismTable from "./PlagiarismTable";

export default function PlagiarismPanel({ assignmentId }) {
  const [report, setReport] = useState(null);
  const [threshold, setThreshold] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runCheck = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await plagiarismApi.check(assignmentId, threshold);
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Plagiarism check failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink-700">Plagiarism check</h3>
      </div>
      <p className="mt-1 text-xs text-ink-400">
        Compares each student&rsquo;s most recent submission via TF-IDF + cosine similarity. Flagged pairs above the
        threshold get an AI-generated explanation of what looks similar.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <label className="text-xs text-ink-400">Flag threshold</label>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-mono text-xs text-ink-500">{Math.round(threshold * 100)}%</span>
      </div>

      <button
        onClick={runCheck}
        disabled={loading}
        className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink-500 disabled:opacity-50"
      >
        {loading ? "Analyzing\u2026" : "Run plagiarism check"}
      </button>

      {error && <p className="mt-2 text-sm text-fail">{error}</p>}

      {report && (
        <div className="mt-4">
          <PlagiarismTable report={report} />
        </div>
      )}
    </div>
  );
}
