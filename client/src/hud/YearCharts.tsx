import type { Side } from "@utopia/engine";
import { memo, useState, type ReactElement } from "react";
import { ChartBody, ChartFrame, LineKey, MetricChart, Readout, type Scrub } from "./LogChart.js";
import type {
  RaceView,
  UprisingMark,
  UprisingsView,
  YearChartsViewModel,
} from "./year-charts-view.js";

/** The height of each island's row of uprisings, in the strip's own units. */
const UPRISING_ROW = 16;
/** A rising's triangle, and a dispersal's ring, are this many units across. */
const UPRISING_MARK = 5;

/**
 * The log as charts: the race for the term, then every figure of the year-end report, year by
 * year. Every chart reads the same year: the latest, or the one the pointer last picked.
 */
export const YearCharts = memo(function YearCharts({ charts }: { charts: YearChartsViewModel }) {
  const scrub = useScrub(charts.years.length);
  return (
    <div className="log-charts">
      <FocusYear years={charts.years} scrub={scrub} />
      <Legend names={charts.names} />
      <RaceChart race={charts.race} years={charts.years} scrub={scrub} />
      {charts.wide.map((chart) => (
        <MetricChart key={chart.title} chart={chart} scrub={scrub} />
      ))}
      <div className="log-pairs">
        {charts.narrow.map((chart) => (
          <MetricChart key={chart.title} chart={chart} scrub={scrub} />
        ))}
      </div>
      <Uprisings view={charts.uprisings} names={charts.names} scrub={scrub} />
    </div>
  );
});

/** The year every chart reads: the latest until the pointer picks another. */
function useScrub(count: number): Scrub {
  const [picked, pick] = useState<number | "latest">("latest");
  const latest = count - 1;
  return {
    at: picked === "latest" ? latest : Math.min(picked, latest),
    moveTo: pick,
    release: () => pick("latest"),
  };
}

function FocusYear({ years, scrub }: { years: readonly number[]; scrub: Scrub }) {
  const latest = scrub.at === years.length - 1;
  return (
    <p className="log-focus-year">
      <strong>Year {years[scrub.at]}</strong>
      <span className="log-focus-of">of {years.length}</span>
      {!latest && (
        <button className="log-latest" onClick={scrub.release}>
          Latest
        </button>
      )}
    </p>
  );
}

function Legend({ names }: { names: Readonly<Record<Side, string>> }) {
  return (
    <p className="log-legend">
      <span>
        <LineKey side="left" />
        {names.left}
      </span>
      <span>
        <LineKey side="right" />
        {names.right}
      </span>
    </p>
  );
}

interface RaceProps {
  readonly race: RaceView;
  readonly years: readonly number[];
  readonly scrub: Scrub;
}

/** The race for the term: who leads, both totals year by year, the gap shaded for the leader. */
function RaceChart({ race, years, scrub }: RaceProps) {
  return (
    <figure className="log-figure log-race">
      <p className="log-headline">{race.headline}</p>
      <figcaption className="log-figure-head">
        <span className="log-figure-title">{race.title}</span>
        <Readout readings={race.readings} at={scrub.at} />
      </figcaption>
      <ChartFrame size={race.size} xs={race.xs} scrub={scrub} label={race.headline}>
        {race.patches.map((patch, index) => (
          <polygon key={index} className={`log-lead ${patch.side}`} points={patch.points} />
        ))}
        <ChartBody chart={race} at={scrub.at} />
      </ChartFrame>
      <p className="log-years">
        <span>Year {years[0]}</span>
        <span>Year {years.at(-1)}</span>
      </p>
    </figure>
  );
}

interface UprisingsProps {
  readonly view: UprisingsView;
  readonly names: Readonly<Record<Side, string>>;
  readonly scrub: Scrub;
}

/** The years rebels rose up, or were dispersed, a row for each island. */
function Uprisings({ view, names, scrub }: UprisingsProps) {
  const size = { width: view.size.width, height: 2 * UPRISING_ROW };
  return (
    <figure className="log-figure">
      <figcaption className="log-figure-head">
        <span className="log-figure-title">Rebels</span>
        <span className="log-uprising-key">▲ rose up · ○ dispersed</span>
      </figcaption>
      <ChartFrame
        size={size}
        xs={view.xs}
        scrub={scrub}
        label="The years rebels rose or were dispersed"
      >
        <UprisingRow side="left" row={0} view={view} name={names.left} />
        <UprisingRow side="right" row={1} view={view} name={names.right} />
      </ChartFrame>
    </figure>
  );
}

interface RowProps {
  readonly side: Side;
  readonly row: number;
  readonly view: UprisingsView;
  readonly name: string;
}

function UprisingRow({ side, row, view, name }: RowProps) {
  const middle = row * UPRISING_ROW + UPRISING_ROW / 2;
  return (
    <g className={`log-uprisings ${side}`}>
      <title>{name}</title>
      <line className="log-grid" x1={0} x2={view.size.width} y1={middle} y2={middle} />
      {view.marks[side].map((mark, index) => (
        <UprisingMarkAt key={index} mark={mark} at={{ x: view.xs[index], y: middle }} />
      ))}
    </g>
  );
}

const UPRISING_MARKS: Readonly<
  Record<UprisingMark, (at: { x: number; y: number }) => ReactElement>
> = {
  rose: ({ x, y }) => (
    <polygon
      className="log-rose"
      points={`${x},${y - UPRISING_MARK} ${x + UPRISING_MARK},${y + UPRISING_MARK} ${x - UPRISING_MARK},${y + UPRISING_MARK}`}
    />
  ),
  dispersed: ({ x, y }) => <circle className="log-dispersed" cx={x} cy={y} r={UPRISING_MARK - 1} />,
  none: () => <></>,
};

function UprisingMarkAt(props: { mark: UprisingMark; at: { x: number; y: number } }) {
  return UPRISING_MARKS[props.mark](props.at);
}
