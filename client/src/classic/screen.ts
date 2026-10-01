import { CARD_PIXELS, COLOURS, SIDES, type GamePhase, type Side } from "@utopia/engine";
import { PALETTE_WORDS, SIDE_COLOURS } from "../art/palette.js";
import { glyphRows } from "../art/pixel-font.js";
import { FRAME_HEIGHT, FRAME_WIDTH } from "./pixel-frame.js";
import { FIELD_WIDTH, SIDE_COLUMNS, type Readout, type Readouts } from "./status-row.js";

/**
 * The whole picture as a television showed it: the playfield inside the Intellivision's blue
 * border, as wide (in background pixels) and as tall (in scanlines) as the cartridge's
 * screenshots show it.
 */
export const BORDER = { across: 10, down: 18 } as const;
export const SCREEN_WIDTH = FRAME_WIDTH + 2 * BORDER.across;
export const SCREEN_HEIGHT = FRAME_HEIGHT + 2 * BORDER.down;

/** Words written in the border, in the cartridge's own letters: x in pixels, y in scanlines. */
export interface ScreenLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly colour: number;
}

const LETTER_PIXELS = 8;
const LETTER_SCANLINES = 16;
const ABOVE = 1;
const BELOW = BORDER.down + FRAME_HEIGHT + 1;
/** The status bar's middle figures, years left and seconds left, named from these pixels. */
const MIDDLE_NAMES = [
  { text: "YRS", x: 50 },
  { text: "TIME", x: 78 },
] as const;
/** What each corner's figure is called, whichever the side buttons show. */
const READOUT_NAMES: Readonly<Record<Readout, string>> = {
  gold: "GOLD",
  total: "TOTAL",
  population: "CENSUS",
  lastRound: "ROUND",
};
/** Each corner's figure is right-aligned in its field, so its name ends where the field ends. */
const cornerEnd = (side: Side) => (SIDE_COLUMNS[side] + FIELD_WIDTH) * CARD_PIXELS;
/** The middle of each island's half of the playfield. */
const HALF_MIDDLES: Readonly<Record<Side, number>> = { left: 40, right: 120 };

export interface LabelScene {
  /** Each island's governor, as they are printed above it. */
  readonly names: Readonly<Record<Side, string>>;
  readonly readouts: Readouts;
  readonly labels: "on" | "off";
  readonly phase: GamePhase;
}

/**
 * What the border names beneath the status bar: its figures while the game is played; nothing at
 * year end, when the bar shows SCORES or TOTALS between the corners and so names them itself.
 */
const BENEATH_THE_BAR: Readonly<Record<GamePhase, (scene: LabelScene) => ScreenLabel[]>> = {
  ready: figureLabels,
  playing: figureLabels,
  scores: () => [],
  totals: () => [],
  over: () => [],
};

/**
 * The words in the border: with the labels on, what each of the status bar's figures is and each
 * island's governor; whatever the setting, what a corner shows while a side button is held.
 */
export function screenLabels(scene: LabelScene): ScreenLabel[] {
  const governors = scene.labels === "on" ? islandLabels(scene.names) : [];
  const words = [...governors, ...BENEATH_THE_BAR[scene.phase](scene)];
  return words.sort((first, second) => first.y - second.y || first.x - second.x);
}

function figureLabels(scene: LabelScene): ScreenLabel[] {
  const holding = SIDES.some((side) => scene.readouts[side] !== "gold");
  const middles = scene.labels === "on" && !holding ? middleLabels() : [];
  return [...cornerLabels(scene), ...middles];
}

function islandLabels(names: Readonly<Record<Side, string>>): ScreenLabel[] {
  return SIDES.map((side) => {
    const text = names[side];
    const x = BORDER.across + HALF_MIDDLES[side] - (text.length * LETTER_PIXELS) / 2;
    return { x, y: ABOVE, text, colour: SIDE_COLOURS[side] };
  });
}

/** A corner is named while the labels are on, or while it shows something other than gold. */
function cornerLabels(scene: LabelScene): ScreenLabel[] {
  const named = (side: Side) => scene.labels === "on" || scene.readouts[side] !== "gold";
  return SIDES.filter(named).map((side) => {
    const text = READOUT_NAMES[scene.readouts[side]];
    const x = BORDER.across + cornerEnd(side) - text.length * LETTER_PIXELS;
    return { x, y: BELOW, text, colour: SIDE_COLOURS[side] };
  });
}

function middleLabels(): ScreenLabel[] {
  return MIDDLE_NAMES.map((name) => ({
    x: BORDER.across + name.x,
    y: BELOW,
    text: name.text,
    colour: COLOURS.yellow,
  }));
}

/** The border's pixels for the whole screen, with any labels written in it. */
export function composeBorder(labels: readonly ScreenLabel[]): Uint32Array {
  const pixels = new Uint32Array(SCREEN_WIDTH * SCREEN_HEIGHT).fill(PALETTE_WORDS[COLOURS.blue]);
  labels.forEach((label) =>
    [...label.text].forEach((letter, index) =>
      paintLetter(pixels, { ...label, text: letter, x: label.x + index * LETTER_PIXELS }),
    ),
  );
  return pixels;
}

function paintLetter(pixels: Uint32Array, letter: ScreenLabel): void {
  const word = PALETTE_WORDS[letter.colour];
  glyphRows(letter.text).forEach((bits, row) => {
    for (let col = 0; col < LETTER_PIXELS; col += 1) {
      if ((bits & (0x80 >> col)) === 0) continue;
      const scanline = letter.y + row * (LETTER_SCANLINES / LETTER_PIXELS);
      pixels[scanline * SCREEN_WIDTH + letter.x + col] = word;
      pixels[(scanline + 1) * SCREEN_WIDTH + letter.x + col] = word;
    }
  });
}
