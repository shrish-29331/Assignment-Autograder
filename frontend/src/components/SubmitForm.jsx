import { useRef, useState } from "react";
import { submissionsApi } from "../api/endpoints";

const EXTENSION_BY_LANGUAGE = { python: ".py", cpp: ".cpp", c: ".c" };

export default function SubmitForm({ assignment, onSubmitted }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to submit.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { data } = await submissionsApi.submit(assignment.id, file);
      onSubmitted(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.response?.data?.detail || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-ink-700">Submit your solution</h3>
      <p className="mt-1 text-xs text-ink-400">
        Expected file type: <span className="font-mono">{EXTENSION_BY_LANGUAGE[assignment.language]}</span>
      </p>

      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mt-3 block w-full text-sm text-ink-500 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-600 hover:file:bg-ink-200"
      />

      {error && <p className="mt-2 text-sm text-fail">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full rounded-md bg-marigold py-2.5 text-sm font-medium text-ink-700 transition hover:bg-marigold-dark hover:text-paper disabled:opacity-50"
      >
        {submitting ? "Submitting\u2026" : "Submit for grading"}
      </button>
    </form>
  );
}
