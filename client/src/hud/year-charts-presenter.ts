import type { Side } from "@utopia/engine";
import {
  linePath,
  plotterFor,
  polygonPoints,
  rangeOf,
  ticksOf,
  tickLabelX,
  type ChartPoint,
  type ChartSize,
  type Plotter,
} from "./chart-scale.js";
import type {
  LeadPatch,
  MetricChartView,
  RaceView,
  UprisingsView,
  YearChartsViewModel,
} from "./year-charts-view.js";
import { YEAR_FIGURES, asCount, islandYearOf, type YearFigure } from "./year-figures.js";
import type { YearRecord } from "./year-log.js";

/** The race stands tallest; each figure runs the panel's width; small counts sit two to a row. */
const RACE_SIZE: ChartSize = { width: 320, height: 112 };
const WIDE_SIZE: ChartSize = { width: 320, height: 58 };
const NARROW_SIZE: ChartSize = { width: 150, height: 46 };
const WIDE_FIGURES: readonly YearFigure[] = [
  YEAR_FIGURES.score,
  YEAR_FIGURES.gold,
  YEAR_FIGURES.population,
  YEAR_FIGURES.growth,
];
const NARROW_FIGURES: readonly YearFigure[] = [
  YEAR_FIGURES.withered,
  YEAR_FIGURES.weather,
  YEAR_FIGURES.boats,
  YEAR_FIGURES.rebelsSent,
];
const THOUSAND = 1000;

type BySide<T> = Readonly<Record<Side, T>>;

/** The years so far, and each island's governor. */
export interface Term {
  readonly years: readonly YearRecord[];
  readonly names: BySide<string>;
}

interface Charting {
  readonly title: string;
  readonly series: BySide<readonly number[]>;
  readonly reads: (value: number) => string;
  readonly size: ChartSize;
}

/** The years so far as charts: the race for the term, then every figure year by year. */
export function presentYearCharts(term: Term): YearChartsViewModel {
  const { years, names } = term;
  const figureChart = (size: ChartSize) => (figure: YearFigure) =>
    chartOf({ title: figure.label, series: seriesOf(years, figure), reads: figure.reads, size });
  return {
    names,
    years: years.map((record) => record.year),
    race: raceOf(term),
    wide: WIDE_FIGURES.map(figureChart(WIDE_SIZE)),
    narrow: NARROW_FIGURES.map(figureChart(NARROW_SIZE)),
    uprisings: uprisingsOf(years),
  };
}

function seriesOf(years: readonly YearRecord[], figure: YearFigure): BySide<number[]> {
  return bySide((side) => years.map((record) => figure.of(islandYearOf(record, side))));
}

function chartOf(charting: Charting): MetricChartView {
  const { title, series, reads, size } = charting;
  const range = rangeOf([...series.left, ...series.right]);
  const plot = plotterFor({ size, count: series.left.length, range });
  const lines = bySide((side) => {
    const points = pointsOf(series[side], plot);
    return { path: linePath(points), points };
  });
  return {
    title,
    size,
    ticks: ticksOf(range).map((value) => ({ y: plot.y(value), label: tickLabel(value) })),
    tickLabelX: tickLabelX(size),
    lines,
    xs: series.left.map((_, index) => plot.x(index)),
    readings: bySide((side) => series[side].map(reads)),
  };
}

function pointsOf(values: readonly number[], plot: Plotter): ChartPoint[] {
  return values.map((value, index) => ({ x: plot.x(index), y: plot.y(value) }));
}

/** Each island's total score year by year, the gap between them shaded for whoever leads. */
function raceOf(term: Term): RaceView {
  const scores = seriesOf(term.years, YEAR_FIGURES.score);
  const totals = bySide((side) => runningTotals(scores[side]));
  const chart = chartOf({ title: "Total score", series: totals, reads: asCount, size: RACE_SIZE });
  const lines = { left: chart.lines.left.points, right: chart.lines.right.points };
  const headline = headlineOf({ totals, names: term.names });
  return { ...chart, patches: patchesOf({ lines, totals }), headline };
}

function runningTotals(values: readonly number[]): number[] {
  return values.reduce<number[]>((totals, value) => [...totals, (totals.at(-1) ?? 0) + value], []);
}

/** Who is ahead after the latest year, and by how much. */
function headlineOf(race: { totals: BySide<readonly number[]>; names: BySide<string> }): string {
  const { totals, names } = race;
  const gap = (totals.left.at(-1) ?? 0) - (totals.right.at(-1) ?? 0);
  const leader = leaderBy(gap);
  if (leader === "level") return "Neck and neck";
  return `${names[leader]} leads by ${asCount(Math.abs(gap))}`;
}

function leaderBy(gap: number): Side | "level" {
  if (gap === 0) return "level";
  return gap > 0 ? "left" : "right";
}

interface Race {
  readonly lines: BySide<readonly ChartPoint[]>;
  readonly totals: BySide<readonly number[]>;
}

function patchesOf(race: Race): LeadPatch[] {
  return race.totals.left.slice(1).flatMap((_, index) => patchesBetween(race, index));
}

/**
 * The gap between the lines from one year to the next, shaded for whoever leads; where the lines
 * cross, split at the crossing, each side of it shaded for the island ahead there.
 */
function patchesBetween(race: Race, index: number): LeadPatch[] {
  const gap = (at: number) => race.totals.left[at] - race.totals.right[at];
  const [before, after] = [gap(index), gap(index + 1)];
  const [left, right] = [race.lines.left, race.lines.right];
  const [l0, l1, r0, r1] = [left[index], left[index + 1], right[index], right[index + 1]];
  if (before * after >= 0) return patchOf(leaderBy(before + after), [l0, l1, r1, r0]);
  const share = before / (before - after);
  const crossing = { x: l0.x + share * (l1.x - l0.x), y: l0.y + share * (l1.y - l0.y) };
  return [
    ...patchOf(leaderBy(before), [l0, crossing, r0]),
    ...patchOf(leaderBy(after), [crossing, l1, r1]),
  ];
}

function patchOf(leader: Side | "level", corners: readonly ChartPoint[]): LeadPatch[] {
  return leader === "level" ? [] : [{ side: leader, points: polygonPoints(corners) }];
}

function uprisingsOf(years: readonly YearRecord[]): UprisingsView {
  const plot = plotterFor({ size: WIDE_SIZE, count: years.length, range: { low: 0, high: 1 } });
  return {
    size: { width: WIDE_SIZE.width },
    xs: years.map((_, index) => plot.x(index)),
    marks: bySide((side) => years.map((record) => record.reports[side].rebels.kind)),
  };
}

/** A tick's value, short: 500, 2k, 15k. */
function tickLabel(value: number): string {
  return Math.abs(value) >= THOUSAND ? `${value / THOUSAND}k` : String(value);
}

function bySide<T>(of: (side: Side) => T): BySide<T> {
  return { left: of("left"), right: of("right") };
}
