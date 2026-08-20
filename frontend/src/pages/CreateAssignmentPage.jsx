import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { assignmentsApi } from "../api/endpoints";
import NavBar from "../components/NavBar";

const emptyTestCase = () => ({ input: "", expected_output: "", hidden: false });

export default function CreateAssignmentPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("python");
  const [deadline, setDeadline] = useState("");
  const [testCaseWeight, setTestCaseWeight] = useState(75);
  const [codeQualityWeight, setCodeQualityWeight] = useState(25);
  const [testCases, setTestCases] = useState([emptyTestCase()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateTestCase = (idx, field, value) => {
    setTestCases((prev) => prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc)));
  };

  const addTestCase = () => setTestCases((prev) => [...prev, emptyTestCase()]);
  const removeTestCase = (idx) => setTestCases((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (testCaseWeight + codeQualityWeight !== 100) {
      setError("Test case weight + code quality weight must add up to 100.");
      return;
    }
    if (testCases.some((tc) => !tc.expected_output.trim())) {
      setError("Every test case needs an expected output.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await assignmentsApi.create({
        title,
        description,
        language,
        deadline: new Date(deadline).toISOString(),
        test_case_weight: testCaseWeight,
        code_quality_weight: codeQualityWeight,
        test_cases: testCases,
      });
      navigate(`/assignments/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink-700">New assignment</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-xl bg-white p-6 shadow-card">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
              >
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Deadline (your local time)</label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Test case weight (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={testCaseWeight}
                onChange={(e) => setTestCaseWeight(Number(e.target.value))}
                className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Code quality weight (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={codeQualityWeight}
                onChange={(e) => setCodeQualityWeight(Number(e.target.value))}
                className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-ink-400">Test cases</label>
              <button
                type="button"
                onClick={addTestCase}
                className="text-xs font-medium text-marigold-dark hover:underline"
              >
                + Add test case
              </button>
            </div>

            <div className="space-y-3">
              {testCases.map((tc, idx) => (
                <div key={idx} className="rounded-lg border border-ink-100 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-ink-300">Stdin input</label>
                      <textarea
                        rows={2}
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                        className="w-full rounded-md border border-ink-100 px-2 py-1.5 font-mono text-xs focus:border-marigold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-ink-300">Expected stdout</label>
                      <textarea
                        rows={2}
                        required
                        value={tc.expected_output}
                        onChange={(e) => updateTestCase(idx, "expected_output", e.target.value)}
                        className="w-full rounded-md border border-ink-100 px-2 py-1.5 font-mono text-xs focus:border-marigold"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-ink-400">
                      <input
                        type="checkbox"
                        checked={tc.hidden}
                        onChange={(e) => updateTestCase(idx, "hidden", e.target.checked)}
                      />
                      Hidden from students
                    </label>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(idx)}
                        className="text-xs text-fail hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-fail">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-paper transition hover:bg-ink-500 disabled:opacity-50"
          >
            {submitting ? "Creating\u2026" : "Create assignment"}
          </button>
        </form>
      </main>
    </div>
  );
}
