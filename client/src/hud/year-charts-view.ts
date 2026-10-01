import type { Side } from "@utopia/engine";
import type { ChartPoint, ChartSize } from "./chart-scale.js";

/** One island's line on a chart: its path, and where each year falls on it. */
export interface ChartLineView {
  readonly path: string;
  readonly points: readonly ChartPoint[];
}

/** A hairline ruled across a chart at a value, and the value it marks. */
export interface ChartTick {
  readonly y: number;
  readonly label: string;
}

/** One figure charted year by year, both islands on the one scale. */
export interface MetricChartView {
  readonly title: string;
  readonly size: ChartSize;
  readonly ticks: readonly ChartTick[];
  readonly tickLabelX: number;
  readonly lines: Readonly<Record<Side, ChartLineView>>;
  /** Where each year stands along the chart, for the hairline that follows the pointer. */
  readonly xs: readonly number[];
  /** Each island's figure for each year, as its readout shows it. */
  readonly readings: Readonly<Record<Side, readonly string[]>>;
}

/** A stretch of the gap between the race's lines, shaded for the island ahead along it. */
export interface LeadPatch {
  readonly side: Side;
  readonly points: string;
}

/** The race: each island's total score, the gap between them shaded for whoever leads it. */
export interface RaceView extends MetricChartView {
  readonly patches: readonly LeadPatch[];
  /** Who is ahead after the latest year, and by how much: "ADA leads by 26". */
  readonly headline: string;
}

/** What became of an island's rebels at a year's end. */
export type UprisingMark = "rose" | "dispersed" | "none";

/** The years rebels rose up, or were dispersed, on each island. */
export interface UprisingsView {
  readonly size: { readonly width: number };
  readonly xs: readonly number[];
  readonly marks: Readonly<Record<Side, readonly UprisingMark[]>>;
}

/** The log as charts: the race, then each figure of the year-end report, year by year. */
export interface YearChartsViewModel {
  /** Each island's governor, as the legend names them. */
  readonly names: Readonly<Record<Side, string>>;
  readonly years: readonly number[];
  readonly race: RaceView;
  /** Figures charted across the panel's whole width. */
  readonly wide: readonly MetricChartView[];
  /** Small counts, charted two to a row. */
  readonly narrow: readonly MetricChartView[];
  readonly uprisings: UprisingsView;
}

const NO_LINE: ChartLineView = { path: "", points: [] };
const NO_CHART: MetricChartView = {
  title: "",
  size: { width: 0, height: 0 },
  ticks: [],
  tickLabelX: 0,
  lines: { left: NO_LINE, right: NO_LINE },
  xs: [],
  readings: { left: [], right: [] },
};

/** No charts at all: the log before its first year is out. */
export const NO_CHARTS: YearChartsViewModel = {
  names: { left: "", right: "" },
  years: [],
  race: { ...NO_CHART, patches: [], headline: "" },
  wide: [],
  narrow: [],
  uprisings: { size: { width: 0 }, xs: [], marks: { left: [], right: [] } },
};
