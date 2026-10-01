/** A chart's drawing, in its own units: the SVG's viewBox, which scales to the panel's width. */
export interface ChartSize {
  readonly width: number;
  readonly height: number;
}

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/** The values a chart's height spans, from its foot to its top. */
export interface ValueRange {
  readonly low: number;
  readonly high: number;
}

/** Where a chart puts a year and a value. */
export interface Plotter {
  readonly x: (index: number) => number;
  readonly y: (value: number) => number;
}

/** The room kept round a chart's plot: the tick labels on the right, a little air elsewhere. */
const INSET = { left: 4, right: 26, top: 5, bottom: 5 };
/** The tick labels stand just clear of the plot's right-hand end. */
const LABEL_GAP = 3;
/** The clean steps a chart's top rounds up to, within each power of ten; past them, the next power. */
const CLEAN_STEPS = [1, 2, 5];
const NEXT_POWER = 10;
/** Paths are drawn to a tenth of a unit. */
const PLACES = 10;

/** The smallest clean number (1, 2 or 5 times a power of ten) at least this big. */
export function niceCeiling(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value));
  const step = CLEAN_STEPS.find((clean) => clean * power >= value) ?? NEXT_POWER;
  return step * power;
}

/** The span a chart needs: from zero, or below it, up to a clean top. */
export function rangeOf(values: readonly number[]): ValueRange {
  const low = lowOf(Math.min(...values));
  return { low, high: highOf({ max: Math.max(...values), low }) };
}

function lowOf(min: number): number {
  return min < 0 ? -niceCeiling(-min) : 0;
}

function highOf(span: { max: number; low: number }): number {
  if (span.max > 0) return niceCeiling(span.max);
  return span.low < 0 ? 0 : 1;
}

/** The values a chart rules a hairline at: its top, zero, and its foot when that is below zero. */
export function ticksOf(range: ValueRange): number[] {
  return [...new Set([range.high, 0, range.low])];
}

/** Where a chart of this size puts each of so many years, and each value in its range. */
export function plotterFor(chart: {
  readonly size: ChartSize;
  readonly count: number;
  readonly range: ValueRange;
}): Plotter {
  const { size, count, range } = chart;
  const across = size.width - INSET.left - INSET.right;
  const down = size.height - INSET.top - INSET.bottom;
  const step = count > 1 ? across / (count - 1) : 0;
  return {
    x: (index) => INSET.left + index * step,
    y: (value) => INSET.top + ((range.high - value) / (range.high - range.low)) * down,
  };
}

/** Where a chart's tick labels start, clear of the plot. */
export function tickLabelX(size: ChartSize): number {
  return size.width - INSET.right + LABEL_GAP;
}

/** The SVG path of a line through the points, to a tenth of a unit. */
export function linePath(points: readonly ChartPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${pathPoint(point)}`).join("");
}

/** An SVG polygon's points: "x,y x,y ...". */
export function polygonPoints(points: readonly ChartPoint[]): string {
  return points.map((point) => `${tenths(point.x)},${tenths(point.y)}`).join(" ");
}

/** The index of the place nearest a pointer along the chart. */
export function nearestIndex(places: readonly number[], at: number): number {
  const gaps = places.map((place) => Math.abs(place - at));
  return gaps.indexOf(Math.min(...gaps));
}

function pathPoint(point: ChartPoint): string {
  return `${tenths(point.x)} ${tenths(point.y)}`;
}

function tenths(value: number): number {
  return Math.round(value * PLACES) / PLACES;
}
