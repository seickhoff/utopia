import type { RoundReport, Side } from "@utopia/engine";
import type { YearEndLine, YearLogEntry, YearLogViewModel } from "./game-view.js";
import type { Losses, YearRecord } from "./year-log.js";
import { REBEL_WORDS, signed } from "./year-end-presenter.js";

interface IslandYear {
  readonly report: RoundReport;
  readonly losses: Losses;
}

type LogLine = readonly [label: string, value: (year: IslandYear) => string];

const LOG_LINES: readonly LogLine[] = [
  ["Score", ({ report }) => String(report.score.total)],
  ["Gold earned", ({ report }) => String(report.goldEarned)],
  ["Births − deaths", ({ report }) => signed(report.population.births - report.population.deaths)],
  ["Crops withered", ({ report }) => String(report.witheredCrops.length)],
  ["Lost to weather", ({ losses }) => String(losses.buildings)],
  ["Boats lost", ({ losses }) => String(losses.boats)],
  ["Rebels sent in", ({ losses }) => String(losses.rebelsSent)],
  ["Rebels at year end", ({ report }) => REBEL_WORDS[report.rebels.kind]],
];

/** The year-by-year log, the latest year first, each island's figures side by side. */
export function presentYearLog(years: readonly YearRecord[]): YearLogViewModel {
  return { entries: [...years].reverse().map(entryOf) };
}

function entryOf(record: YearRecord): YearLogEntry {
  const island = (side: Side): IslandYear => ({
    report: record.reports[side],
    losses: record.losses[side],
  });
  const line = ([label, value]: LogLine): YearEndLine => ({
    label,
    left: value(island("left")),
    right: value(island("right")),
  });
  return { title: `Year ${record.year}`, lines: LOG_LINES.map(line) };
}
