import type { YearEndLine, YearEndViewModel } from "./game-view.js";

export function YearEndPanel({ yearEnd }: { yearEnd: YearEndViewModel }) {
  if (yearEnd.shown === "none") return <></>;
  return (
    <section className={`year-end ${yearEnd.shown}`}>
      <h2>{yearEnd.title}</h2>
      <ReportTable lines={yearEnd.lines} />
    </section>
  );
}

export function ReportTable({ lines }: { lines: readonly YearEndLine[] }) {
  return (
    <table className="report">
      <tbody>
        {lines.map((line) => (
          <tr key={line.label}>
            <td className="side-left">{line.left}</td>
            <th>{line.label}</th>
            <td className="side-right">{line.right}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
