import type { YearEndLine, YearLogEntry, YearLogViewModel } from "./game-view.js";
import { presentYearCharts, type Term } from "./year-charts-presenter.js";
import { REBEL_WORDS } from "./year-end-presenter.js";
import { YEAR_FIGURES, islandYearOf, type IslandYear, type YearFigure } from "./year-figures.js";
import type { YearRecord } from "./year-log.js";

type LogLine = readonly [label: string, value: (year: IslandYear) => string];

const figureLine = (figure: YearFigure): LogLine => [
  figure.label,
  (year) => figure.reads(figure.of(year)),
];

const LOG_LINES: readonly LogLine[] = [
  ...Object.values(YEAR_FIGURES).map(figureLine),
  ["Rebels at year end", ({ report }) => REBEL_WORDS[report.rebels.kind]],
];

/** What the log shows by how many years are out: one year makes no line, so it is told as text. */
const SHOWN_AFTER_YEARS = ["nothing", "text", "charts"] as const;

/** The year-by-year log: each year's figures, the latest first, and the years as charts. */
export function presentYearLog(term: Term): YearLogViewModel {
  const { years } = term;
  return {
    shows: SHOWN_AFTER_YEARS[Math.min(years.length, SHOWN_AFTER_YEARS.length - 1)],
    entries: [...years].reverse().map(entryOf),
    charts: presentYearCharts(term),
  };
}

function entryOf(record: YearRecord): YearLogEntry {
  const line = ([label, value]: LogLine): YearEndLine => ({
    label,
    left: value(islandYearOf(record, "left")),
    right: value(islandYearOf(record, "right")),
  });
  return { title: `Year ${record.year}`, lines: LOG_LINES.map(line) };
}
