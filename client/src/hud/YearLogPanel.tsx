import { useState, type ReactElement } from "react";
import type { YearLogEntry, YearLogViewModel } from "./game-view.js";
import { YearCharts } from "./YearCharts.js";
import { ReportTable } from "./YearEndPanel.js";

type LogProps = { readonly log: YearLogViewModel };

const LOG_SHOWS: Readonly<Record<YearLogViewModel["shows"], (props: LogProps) => ReactElement>> = {
  nothing: () => <p className="log-empty">Each year's report will appear here as the year ends.</p>,
  text: YearTables,
  charts: ChartedLog,
};

/** The year-by-year log: nothing yet, the first year told as text, then charts. */
export function YearLogPanel({ log }: LogProps) {
  return LOG_SHOWS[log.shows]({ log });
}

/** The log as charts, or as the years' tables, which give every figure exactly. */
function ChartedLog({ log }: LogProps) {
  const [shown, show] = useState<"charts" | "tables">("charts");
  return (
    <div className="year-log">
      <div className="log-views" role="group" aria-label="Show the log as">
        <button aria-pressed={shown === "charts"} onClick={() => show("charts")}>
          Charts
        </button>
        <button aria-pressed={shown === "tables"} onClick={() => show("tables")}>
          Table
        </button>
      </div>
      {shown === "charts" ? <YearCharts charts={log.charts} /> : <YearTables log={log} />}
    </div>
  );
}

function YearTables({ log }: LogProps) {
  const { names } = log.charts;
  return (
    <div className="year-log">
      <p className="log-sides">
        <span className="side-left">{names.left}</span>
        <span className="side-right">{names.right}</span>
      </p>
      {log.entries.map((entry) => (
        <LogYear key={entry.title} entry={entry} />
      ))}
    </div>
  );
}

function LogYear({ entry }: { entry: YearLogEntry }) {
  return (
    <section className="log-year">
      <h3>{entry.title}</h3>
      <ReportTable lines={entry.lines} />
    </section>
  );
}
