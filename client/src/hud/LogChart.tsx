import type { Side } from "@utopia/engine";
import type { PointerEvent, ReactNode } from "react";
import { nearestIndex, type ChartPoint, type ChartSize } from "./chart-scale.js";
import type { ChartLineView, MetricChartView } from "./year-charts-view.js";

/** The year every chart is reading, and the pointer's say over it. */
export interface Scrub {
  readonly at: number;
  readonly moveTo: (index: number) => void;
  readonly release: () => void;
}

/** A focus marker's half-width: 8 across, a ring of the panel's colour round it. */
const MARK = 4;

interface FrameProps {
  readonly size: ChartSize;
  readonly xs: readonly number[];
  readonly scrub: Scrub;
  readonly label: string;
  readonly children: ReactNode;
}

/**
 * A chart's drawing. The pointer anywhere over it picks the nearest year for every chart at
 * once; a mouse that leaves hands back the latest year, a finger leaves the year it picked.
 */
export function ChartFrame({ size, xs, scrub, label, children }: FrameProps) {
  return (
    <svg
      className="log-chart"
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="img"
      aria-label={label}
      {...pickingHandlers({ size, xs, scrub })}
    >
      {children}
      <line className="log-focus" x1={xs[scrub.at]} x2={xs[scrub.at]} y1={0} y2={size.height} />
    </svg>
  );
}

/** The pointer over a chart picks the year nearest it; a mouse that leaves lets the year go. */
function pickingHandlers(chart: Pick<FrameProps, "size" | "xs" | "scrub">) {
  const { size, xs, scrub } = chart;
  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    scrub.moveTo(nearestIndex(xs, ((event.clientX - box.left) / box.width) * size.width));
  };
  const leave = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse") scrub.release();
  };
  return { onPointerDown: pick, onPointerMove: pick, onPointerLeave: leave };
}

/** One figure, year by year: its name and the focus year's readings above, the lines below. */
export function MetricChart({ chart, scrub }: { chart: MetricChartView; scrub: Scrub }) {
  return (
    <figure className="log-figure">
      <figcaption className="log-figure-head">
        <span className="log-figure-title">{chart.title}</span>
        <Readout readings={chart.readings} at={scrub.at} />
      </figcaption>
      <ChartFrame size={chart.size} xs={chart.xs} scrub={scrub} label={chart.title}>
        <ChartBody chart={chart} at={scrub.at} />
      </ChartFrame>
    </figure>
  );
}

/** A chart's hairlines, its two lines, and the focus year's marks on them. */
export function ChartBody({ chart, at }: { chart: MetricChartView; at: number }) {
  return (
    <>
      <Ticks chart={chart} />
      <SideLine side="left" line={chart.lines.left} />
      <SideLine side="right" line={chart.lines.right} />
      <FocusMarks
        points={{ left: chart.lines.left.points[at], right: chart.lines.right.points[at] }}
      />
    </>
  );
}

function Ticks({ chart }: { chart: MetricChartView }) {
  return chart.ticks.map((tick) => (
    <g key={tick.label}>
      <line className="log-grid" x1={0} x2={chart.tickLabelX - MARK} y1={tick.y} y2={tick.y} />
      <text className="log-tick" x={chart.tickLabelX} y={tick.y + MARK}>
        {tick.label}
      </text>
    </g>
  ));
}

function SideLine({ side, line }: { side: Side; line: ChartLineView }) {
  return <path className={`log-line ${side}`} d={line.path} />;
}

/** The focus year on each line: a dot on the left island's, a square on the right's. */
function FocusMarks({ points }: { points: Readonly<Record<Side, ChartPoint | undefined>> }) {
  const { left, right } = points;
  return (
    <>
      {left && <circle className="log-mark left" cx={left.x} cy={left.y} r={MARK} />}
      {right && (
        <rect
          className="log-mark right"
          x={right.x - MARK}
          y={right.y - MARK}
          width={2 * MARK}
          height={2 * MARK}
        />
      )}
    </>
  );
}

/** Both islands' readings for the focus year, each keyed by a stroke of its line. */
export function Readout(props: {
  readings: Readonly<Record<Side, readonly string[]>>;
  at: number;
}) {
  const { readings, at } = props;
  return (
    <span className="log-readout">
      <LineKey side="left" />
      <span className="log-value">{readings.left[at]}</span>
      <LineKey side="right" />
      <span className="log-value">{readings.right[at]}</span>
    </span>
  );
}

/** A short stroke of an island's line, with its mark: what its readings and names wear. */
export function LineKey({ side }: { side: Side }) {
  return <i className={`log-key ${side}`} aria-hidden="true" />;
}
