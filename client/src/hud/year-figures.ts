import type { RoundReport, Side } from "@utopia/engine";
import { signed } from "./year-end-presenter.js";
import type { Losses, YearRecord } from "./year-log.js";

/** One island's year: its year-end report, and what it lost along the way. */
export interface IslandYear {
  readonly report: RoundReport;
  readonly losses: Losses;
}

/** A figure of an island's year: what it is called, its value, and how the value reads. */
export interface YearFigure {
  readonly label: string;
  readonly of: (year: IslandYear) => number;
  readonly reads: (value: number) => string;
}

export function islandYearOf(record: YearRecord, side: Side): IslandYear {
  return { report: record.reports[side], losses: record.losses[side] };
}

/** A whole number as the log prints it: 1,027. */
export function asCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** Every figure the log keeps of a year, for its tables and its charts alike. */
export const YEAR_FIGURES = {
  score: { label: "Score", of: ({ report }) => report.score.total, reads: asCount },
  gold: { label: "Gold earned", of: ({ report }) => report.goldEarned, reads: asCount },
  population: { label: "Population", of: ({ report }) => report.population.after, reads: asCount },
  growth: {
    label: "Births − deaths",
    of: ({ report }) => report.population.births - report.population.deaths,
    reads: signed,
  },
  withered: {
    label: "Crops withered",
    of: ({ report }) => report.witheredCrops.length,
    reads: asCount,
  },
  weather: { label: "Lost to weather", of: ({ losses }) => losses.buildings, reads: asCount },
  boats: { label: "Boats lost", of: ({ losses }) => losses.boats, reads: asCount },
  rebelsSent: { label: "Rebels sent in", of: ({ losses }) => losses.rebelsSent, reads: asCount },
} as const satisfies Readonly<Record<string, YearFigure>>;
