import { CARD_PIXELS, Square } from "./square.js";

/**
 * A point in sprite (MOB) coordinates, whole pixels. The screen's top-left pixel is at (8, 8):
 * a sprite at (8, 8) covers the first card exactly.
 */
export class PixelPoint {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}
}

const MOB_ORIGIN = 8;
/** The cartridge reads "the card under a sprite" at the centre of its top-left 8x8 block. */
const TO_CENTRE = 4;

/** MOB_TO_CARD: the card under a sprite at this point. */
export function squareUnder(point: PixelPoint): Square {
  const col = Math.floor((point.x + TO_CENTRE) / CARD_PIXELS) - 1;
  const row = Math.floor((point.y + TO_CENTRE) / CARD_PIXELS) - 1;
  return Square.at(row, col);
}

/** Where a sprite sits to cover a square exactly. */
export function squareAnchor(square: Square): PixelPoint {
  return new PixelPoint(
    square.col * CARD_PIXELS + MOB_ORIGIN,
    square.row * CARD_PIXELS + MOB_ORIGIN,
  );
}
