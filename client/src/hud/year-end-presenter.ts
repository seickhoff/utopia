import type { GameEvent, GameSnapshot, RoundReport, Side } from "@utopia/engine";
import { NO_YEAR_END, type YearEndLine, type YearEndViewModel } from "./game-view.js";

export type RoundEnded = Extract<GameEvent, { type: "roundEnded" }>;

export interface YearEndInput {
  readonly snapshot: GameSnapshot;
  readonly report: RoundEnded;
}

type ReportLine = readonly [label: string, value: (report: RoundReport) => string];

const SCORE_LINES: readonly ReportLine[] = [
  ["Housing", (report) => String(report.score.housing)],
  ["GDP per head", (report) => String(report.score.gdp)],
  ["Food", (report) => String(report.score.food)],
  ["Schools", (report) => String(report.score.schools)],
  ["Hospitals", (report) => String(report.score.hospitals)],
  ["Round score", (report) => String(report.score.total)],
  ["Gold earned", (report) => String(report.goldEarned)],
  ["Births − deaths", (report) => signed(report.population.births - report.population.deaths)],
  ["Crops withered", (report) => String(report.witheredCrops.length)],
  ["Rebels", (report) => REBEL_WORDS[report.rebels.kind]],
];

export const REBEL_WORDS: Readonly<Record<RoundReport["rebels"]["kind"], string>> = {
  rose: "rose up",
  dispersed: "dispersed",
  none: "—",
};

const PHASE_VIEWS: Readonly<
  Record<GameSnapshot["phase"], (input: YearEndInput) => YearEndViewModel>
> = {
  ready: () => NO_YEAR_END,
  playing: () => NO_YEAR_END,
  scores: scoresView,
  totals: totalsView,
  over: totalsView,
};

/** The year-end report: the round's sums while SCORES shows, the running totals after. */
export function presentYearEnd(input: YearEndInput): YearEndViewModel {
  return PHASE_VIEWS[input.snapshot.phase](input);
}

function scoresView(input: YearEndInput): YearEndViewModel {
  const { reports, round } = input.report;
  const line = ([label, value]: ReportLine) => ({
    label,
    left: value(reports.left),
    right: value(reports.right),
  });
  return { shown: "scores", title: `Year ${round} report`, lines: SCORE_LINES.map(line) };
}

function totalsView(input: YearEndInput): YearEndViewModel {
  const { islands, round } = input.snapshot;
  const line = (label: string, value: (side: Side) => number): YearEndLine => ({
    label,
    left: value("left").toLocaleString("en-US"),
    right: value("right").toLocaleString("en-US"),
  });
  return {
    shown: "totals",
    title: `Totals after year ${round}`,
    lines: [
      line("Total score", (side) => islands[side].totalScore),
      line("Gold", (side) => islands[side].gold),
      line("Population", (side) => islands[side].population),
    ],
  };
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
