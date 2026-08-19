export default function TestCaseTable({ results }) {
  if (!results?.length) {
    return <p className="text-sm text-ink-300">No test cases defined for this assignment.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-100">
      <table className="w-full text-sm">
        <thead className="bg-paper-dim text-left text-ink-400">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Input</th>
            <th className="px-3 py-2 font-medium">Expected</th>
            <th className="px-3 py-2 font-medium">Actual</th>
            <th className="px-3 py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {results.map((tc, i) => (
            <tr key={i} className={tc.passed ? "" : "bg-fail/5"}>
              <td className="px-3 py-2 font-mono text-ink-300">{i + 1}</td>
              <td className="px-3 py-2 font-mono whitespace-pre-wrap max-w-[12rem] truncate">
                {tc.hidden ? <span className="italic text-ink-300">hidden</span> : tc.input || <span className="text-ink-300">(none)</span>}
              </td>
              <td className="px-3 py-2 font-mono whitespace-pre-wrap max-w-[12rem] truncate">
                {tc.hidden ? <span className="italic text-ink-300">hidden</span> : tc.expected_output}
              </td>
              <td className="px-3 py-2 font-mono whitespace-pre-wrap max-w-[12rem] truncate">
                {tc.actual_output || <span className="text-ink-300">(empty)</span>}
              </td>
              <td className="px-3 py-2">
                {tc.passed ? (
                  <span className="font-medium text-pass">Pass</span>
                ) : (
                  <span className="font-medium text-fail">Fail</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
