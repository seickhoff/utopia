import { BLANK_CARD, backtabCard } from "../board/backtab.js";
import type { Board } from "../board/board.js";
import { CARD_PIXELS, GRID_COLUMNS, Square, STATUS_ROW } from "../geometry/square.js";
import { bitRows } from "../rom/bitmap.js";
import { CARD_PICTURES } from "../rom/card-pictures.js";

export const SCREEN_WIDTH = GRID_COLUMNS * CARD_PIXELS;
export const SEA_HEIGHT = STATUS_ROW * CARD_PIXELS;

const CARD_ROWS = CARD_PICTURES.map(bitRows);
const LEFTMOST_BIT = 0x80;

/** A screen pixel, (0, 0) at the top left. */
export interface ScreenPixel {
  readonly x: number;
  readonly y: number;
}

/**
 * The background's foreground pixels, which sprites collide with: land, the items standing on it
 * (on their tan ground, which is background colour) and anchored boats. The status row is left
 * out; the sea holds nothing.
 */
export class Playfield {
  private constructor(private readonly lit: Uint8Array) {}

  static of(board: Board): Playfield {
    const lit = new Uint8Array(SCREEN_WIDTH * SEA_HEIGHT);
    for (let offset = 0; offset < STATUS_ROW * GRID_COLUMNS; offset += 1) {
      const square = Square.fromOffset(offset);
      paintCard(lit, { square, card: backtabCard(board.contentAt(square), board.wreckAt(square)) });
    }
    return new Playfield(lit);
  }

  isForeground(pixel: ScreenPixel): boolean {
    if (pixel.x < 0 || pixel.x >= SCREEN_WIDTH || pixel.y < 0 || pixel.y >= SEA_HEIGHT) {
      return false;
    }
    return this.lit[pixel.y * SCREEN_WIDTH + pixel.x] === 1;
  }
}

interface CardAt {
  readonly square: Square;
  readonly card: number;
}

function paintCard(lit: Uint8Array, cardAt: CardAt): void {
  if (cardAt.card === BLANK_CARD) return;
  const rows = CARD_ROWS[cardAt.card];
  const left = cardAt.square.col * CARD_PIXELS;
  const top = cardAt.square.row * CARD_PIXELS;
  rows.forEach((bits, row) => {
    for (let col = 0; col < CARD_PIXELS; col += 1) {
      if (bits & (LEFTMOST_BIT >> col)) lit[(top + row) * SCREEN_WIDTH + left + col] = 1;
    }
  });
}

/** The playfield of a board, rebuilt only when the board has changed since it was last asked. */
export class PlayfieldCache {
  private built: Playfield;
  private builtAt: number;

  constructor(private readonly board: Board) {
    this.built = Playfield.of(board);
    this.builtAt = board.revision;
  }

  current(): Playfield {
    if (this.builtAt !== this.board.revision) {
      this.built = Playfield.of(this.board);
      this.builtAt = this.board.revision;
    }
    return this.built;
  }
}
