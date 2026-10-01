import {
  CARD_PIXELS,
  COLOURS,
  GRID_COLUMNS,
  GRID_ROWS,
  SCANLINES_PER_PIXEL,
  SIDES,
  SPRITE_LOOKS,
  scanlineMask,
  scanlinesOf,
  shapeOf,
  type DrifterKind,
  type Footprint,
  type GameSnapshot,
  type Side,
  type SpriteSnapshot,
} from "@utopia/engine";
import { PALETTE_WORDS, SIDE_COLOURS } from "../art/palette.js";
import { glyphRows } from "../art/pixel-font.js";
import { composeBacktab, type CardCell } from "./backtab.js";
import { statusRuns, type Readouts, type TextRun } from "./status-row.js";

export const FRAME_WIDTH = GRID_COLUMNS * CARD_PIXELS;
/** Rows of the frame are scanlines, half a background pixel tall, as the STIC draws sprites. */
export const FRAME_HEIGHT = GRID_ROWS * CARD_PIXELS * SCANLINES_PER_PIXEL;

/** The frame's pixels, and which background pixels are foreground (for sprites drawn behind). */
export class ClassicPixels {
  readonly pixels = new Uint32Array(FRAME_WIDTH * FRAME_HEIGHT);
  readonly foreground = new Uint8Array(FRAME_WIDTH * (FRAME_HEIGHT / SCANLINES_PER_PIXEL));
}

export interface FrameInput {
  readonly snapshot: GameSnapshot;
  readonly readouts: Readouts;
}

interface SpriteDraw {
  readonly slot: number;
  readonly footprint: Footprint;
  readonly colour: number;
  /** Fish swim under the land (their MOBs have "priority below cards"). */
  readonly behind: boolean;
}

const PILOT_SLOTS: Readonly<Record<Side, number>> = { left: 2, right: 3 };
const DRIFTER_COLOURS: Readonly<Record<DrifterKind, number>> = {
  rain: COLOURS.grey,
  storm: COLOURS.black,
  hurricane: COLOURS.white,
  pirate: COLOURS.black,
  fish: COLOURS.darkGreen,
};
const MOB_ORIGIN = 8;
const TOP_BIT = 0x8000;
const LEFT_BIT = 0x80;

/** Draws a snapshot as the Intellivision would: cards, the status bar, then the sprites. */
export function composeFrame(input: FrameInput, canvas: ClassicPixels): void {
  const { snapshot } = input;
  composeBacktab(snapshot).forEach((cell, index) => paintCard(canvas, { cell, index }));
  statusRuns(snapshot, input.readouts).forEach((run) => paintText(canvas, run));
  spritesOf(snapshot).forEach((sprite) => paintSprite(canvas, sprite));
}

interface PlacedCard {
  readonly cell: CardCell;
  readonly index: number;
}

function paintCard(canvas: ClassicPixels, placed: PlacedCard): void {
  const left = (placed.index % GRID_COLUMNS) * CARD_PIXELS;
  const top = Math.floor(placed.index / GRID_COLUMNS) * CARD_PIXELS;
  const { rows, foreground, background } = placed.cell;
  rows.forEach((bits, row) => {
    for (let col = 0; col < CARD_PIXELS; col += 1) {
      const lit = (bits & (LEFT_BIT >> col)) !== 0;
      paintBackgroundPixel(canvas, {
        x: left + col,
        y: top + row,
        colour: lit ? foreground : background,
        lit,
      });
    }
  });
}

interface BackgroundPixel {
  readonly x: number;
  readonly y: number;
  readonly colour: number;
  readonly lit: boolean;
}

function paintBackgroundPixel(canvas: ClassicPixels, pixel: BackgroundPixel): void {
  const word = PALETTE_WORDS[pixel.colour];
  const scanline = pixel.y * SCANLINES_PER_PIXEL;
  canvas.pixels[scanline * FRAME_WIDTH + pixel.x] = word;
  canvas.pixels[(scanline + 1) * FRAME_WIDTH + pixel.x] = word;
  canvas.foreground[pixel.y * FRAME_WIDTH + pixel.x] = pixel.lit ? 1 : 0;
}

/** Text is drawn in the system font's colour on the blue of the colour stack. */
function paintText(canvas: ClassicPixels, run: TextRun): void {
  [...run.text].forEach((character, offset) => {
    const cell = { rows: glyphRows(character), foreground: run.colour, background: COLOURS.blue };
    paintCard(canvas, { cell, index: run.row * GRID_COLUMNS + run.col + offset });
  });
}

/** Every sprite on screen, lowest priority first: MOB 0 is drawn over MOB 7. */
function spritesOf(snapshot: GameSnapshot): SpriteDraw[] {
  const pilots = snapshot.phase === "over" ? [] : SIDES.map((side) => pilotDraw(snapshot, side));
  const drifters = snapshot.sprites.map(drifterDraw);
  return [...pilots, ...drifters].sort((first, second) => second.slot - first.slot);
}

function pilotDraw(snapshot: GameSnapshot, side: Side): SpriteDraw {
  const pilot = snapshot.islands[side].pilot;
  const shape = shapeOf(SPRITE_LOOKS[pilot.look], pilot.frame);
  const footprint = { x: pilot.x, y: pilot.y, shape, mirrored: pilot.mirrored };
  return { slot: PILOT_SLOTS[side], footprint, colour: SIDE_COLOURS[side], behind: false };
}

function drifterDraw(sprite: SpriteSnapshot): SpriteDraw {
  const shape = shapeOf(SPRITE_LOOKS[sprite.look], sprite.frame);
  const footprint = { x: sprite.x, y: sprite.y, shape, mirrored: sprite.mirrored };
  const colour = DRIFTER_COLOURS[sprite.kind];
  return { slot: sprite.slot, footprint, colour, behind: sprite.kind === "fish" };
}

function paintSprite(canvas: ClassicPixels, sprite: SpriteDraw): void {
  const { footprint } = sprite;
  const top = (footprint.y - MOB_ORIGIN) * SCANLINES_PER_PIXEL;
  for (let scanline = 0; scanline < scanlinesOf(footprint.shape); scanline += 1) {
    const row = top + scanline;
    if (row < 0 || row >= FRAME_HEIGHT) continue;
    paintSpriteRow(canvas, { sprite, row, mask: scanlineMask(footprint, scanline) });
  }
}

interface SpriteRow {
  readonly sprite: SpriteDraw;
  readonly row: number;
  readonly mask: number;
}

function paintSpriteRow(canvas: ClassicPixels, spriteRow: SpriteRow): void {
  const { sprite, row, mask } = spriteRow;
  const left = sprite.footprint.x - MOB_ORIGIN;
  const backgroundRow = Math.floor(row / SCANLINES_PER_PIXEL) * FRAME_WIDTH;
  for (let column = 0; column < 16; column += 1) {
    const x = left + column;
    if ((mask & (TOP_BIT >>> column)) === 0 || x < 0 || x >= FRAME_WIDTH) continue;
    if (sprite.behind && canvas.foreground[backgroundRow + x] === 1) continue;
    canvas.pixels[row * FRAME_WIDTH + x] = PALETTE_WORDS[sprite.colour];
  }
}
