import {
  COLOURS,
  STATUS_ROW,
  type GamePhase,
  type GameSnapshot,
  type IslandSnapshot,
  type Side,
} from "@utopia/engine";
import { SIDE_COLOURS } from "../art/palette.js";
import type { SideButton } from "../board/controller.js";

/**
 * What a governor shows in their corner of the status bar: gold, or, while one of the side
 * buttons is held, the total score, the population, or the last round's score.
 */
export type Readout = "gold" | "total" | "population" | "lastRound";
export type Readouts = Readonly<Record<Side, Readout>>;

export const GOLD_READOUTS: Readouts = { left: "gold", right: "gold" };

const SIDE_BUTTON_READOUTS: Readonly<Record<SideButton, Readout>> = {
  total: "total",
  census: "population",
  round: "lastRound",
};

/**
 * What the corners show while side buttons are held: the first one's figure, in both corners, so
 * the two islands can be compared. (On the console each governor held their own buttons, and only
 * their own corner changed.)
 */
export function readoutsWhileHeld(held: ReadonlySet<SideButton>): Readouts {
  const [button] = [...held];
  if (button === undefined) return GOLD_READOUTS;
  const readout = SIDE_BUTTON_READOUTS[button];
  return { left: readout, right: readout };
}

/** A run of text on the screen's card grid. */
export interface TextRun {
  readonly row: number;
  readonly col: number;
  readonly text: string;
  readonly colour: number;
}

interface YearEndWord {
  readonly word: string;
  readonly value: (island: IslandSnapshot) => number;
}

/** Each corner's figure is printed four cards wide, from these columns. */
export const FIELD_WIDTH = 4;
export const SIDE_COLUMNS: Readonly<Record<Side, number>> = { left: 1, right: 15 };
const TURNS_WIDTH = 2;
const TURNS_COLUMN = 7;
const SECONDS_COLUMN = 9;
const FINAL_SCORE: TextRun = { row: 10, col: 4, text: "FINAL  SCORE", colour: COLOURS.black };
const SCORES: YearEndWord = { word: "SCORES", value: (island) => island.roundScore };
const TOTALS: YearEndWord = { word: "TOTALS", value: (island) => island.totalScore };

const READOUT_VALUES: Readonly<Record<Readout, (island: IslandSnapshot) => number>> = {
  gold: (island) => island.gold,
  total: (island) => island.totalScore,
  population: (island) => island.population,
  lastRound: (island) => island.roundScore,
};

const PHASE_RUNS: Readonly<
  Record<GamePhase, (snapshot: GameSnapshot, readouts: Readouts) => TextRun[]>
> = {
  ready: playingRuns,
  playing: playingRuns,
  scores: (snapshot) => yearEndRuns(snapshot, SCORES),
  totals: (snapshot) => yearEndRuns(snapshot, TOTALS),
  over: (snapshot) => [...yearEndRuns(snapshot, TOTALS), FINAL_SCORE],
};

/** The status bar (and at the end, "FINAL SCORE" above it), laid out as the cartridge prints it. */
export function statusRuns(snapshot: GameSnapshot, readouts: Readouts): TextRun[] {
  return PHASE_RUNS[snapshot.phase](snapshot, readouts);
}

function playingRuns(snapshot: GameSnapshot, readouts: Readouts): TextRun[] {
  const corner = (side: Side) =>
    sideField(side, READOUT_VALUES[readouts[side]](snapshot.islands[side]));
  return [
    corner("left"),
    numberRun({ col: TURNS_COLUMN, width: TURNS_WIDTH, value: snapshot.roundsLeft }),
    numberRun({ col: SECONDS_COLUMN, width: FIELD_WIDTH, value: snapshot.secondsLeft }),
    corner("right"),
  ];
}

function yearEndRuns(snapshot: GameSnapshot, shown: YearEndWord): TextRun[] {
  const { left, right } = snapshot.islands;
  const word = { row: STATUS_ROW, col: TURNS_COLUMN, text: shown.word, colour: COLOURS.white };
  return [sideField("left", shown.value(left)), word, sideField("right", shown.value(right))];
}

function sideField(side: Side, value: number): TextRun {
  const text = String(value).padStart(FIELD_WIDTH);
  return { row: STATUS_ROW, col: SIDE_COLUMNS[side], text, colour: SIDE_COLOURS[side] };
}

interface NumberField {
  readonly col: number;
  readonly width: number;
  readonly value: number;
}

function numberRun(field: NumberField): TextRun {
  const text = String(field.value).padStart(field.width);
  return { row: STATUS_ROW, col: field.col, text, colour: COLOURS.yellow };
}
