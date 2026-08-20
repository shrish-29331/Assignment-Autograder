export default function TestCaseTable({ results }) {
  if (!results?.length) {
    return (
      <p className="text-sm text-ink-300">
        No test cases defined for this assignment.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-ink-100">
      <table className="min-w-[520px] w-full table-fixed text-xs sm:text-sm">
        <colgroup>
          <col className="w-10" />
          <col className="w-[28%]" />
          <col className="w-[23%]" />
          <col className="w-[23%]" />
          <col className="w-16" />
        </colgroup>

        <thead className="bg-paper-dim text-left text-ink-400">
          <tr>
            <th className="px-2 py-2 font-medium sm:px-3">#</th>
            <th className="px-2 py-2 font-medium sm:px-3">Input</th>
            <th className="px-2 py-2 font-medium sm:px-3">Expected</th>
            <th className="px-2 py-2 font-medium sm:px-3">Actual</th>
            <th className="px-2 py-2 font-medium sm:px-3">Result</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-ink-100">
          {results.map((tc, i) => (
            <tr key={i} className={tc.passed ? "" : "bg-fail/5"}>
              <td className="px-2 py-2 align-top font-mono text-ink-300 sm:px-3">
                {i + 1}
              </td>

              <td className="px-2 py-2 align-top font-mono sm:px-3">
                <div className="max-h-20 overflow-auto whitespace-pre-wrap break-words leading-5">
                  {tc.hidden ? (
                    <span className="italic text-ink-300">hidden</span>
                  ) : tc.input ? (
                    tc.input
                  ) : (
                    <span className="text-ink-300">(none)</span>
                  )}
                </div>
              </td>

              <td className="px-2 py-2 align-top font-mono sm:px-3">
                <div className="max-h-20 overflow-auto whitespace-pre-wrap break-words leading-5">
                  {tc.hidden ? (
                    <span className="italic text-ink-300">hidden</span>
                  ) : tc.expected_output ? (
                    tc.expected_output
                  ) : (
                    <span className="text-ink-300">(empty)</span>
                  )}
                </div>
              </td>

              <td className="px-2 py-2 align-top font-mono sm:px-3">
                <div className="max-h-20 overflow-auto whitespace-pre-wrap break-words leading-5">
                  {tc.actual_output ? (
                    tc.actual_output
                  ) : (
                    <span className="text-ink-300">(empty)</span>
                  )}
                </div>
              </td>

              <td className="px-2 py-2 align-top sm:px-3">
                {tc.passed ? (
                  <span className="font-semibold text-pass">Pass</span>
                ) : (
                  <span className="font-semibold text-fail">Fail</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}