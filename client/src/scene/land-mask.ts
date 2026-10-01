import {
  CARD_PICTURES,
  CARD_PIXELS,
  ISLANDS,
  SIDES,
  bitRows,
  type IslandSquare,
} from "@utopia/engine";

/** The sea's pixels: 160 across, 88 down (the 20 x 11 cards above the status bar). */
export const MASK_WIDTH = 160;
export const MASK_HEIGHT = 88;

const CARD_ROWS = CARD_PICTURES.map(bitRows);
const LEFTMOST_BIT = 0x80;

/**
 * Which of the sea's pixels are land, drawn from the cartridge's own coastline cards: the islands'
 * true outline, pixel for pixel, for the diorama to shape its terrain around.
 */
export function landMask(): Uint8Array {
  const mask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  SIDES.forEach((side) => ISLANDS[side].forEach((land) => paintLand(mask, land)));
  return mask;
}

function paintLand(mask: Uint8Array, land: IslandSquare): void {
  const left = land.square.col * CARD_PIXELS;
  const top = land.square.row * CARD_PIXELS;
  CARD_ROWS[land.coastCard].forEach((bits, row) => {
    for (let col = 0; col < CARD_PIXELS; col += 1) {
      if (bits & (LEFTMOST_BIT >> col)) mask[(top + row) * MASK_WIDTH + left + col] = 1;
    }
  });
}

/** A land mask with a margin of open sea round it, so the shallows can reach past the board. */
export interface PaddedMask {
  readonly mask: Uint8Array;
  readonly width: number;
  readonly pad: number;
}

export function paddedLandMask(pad: number): PaddedMask {
  const width = MASK_WIDTH + 2 * pad;
  const mask = new Uint8Array(width * (MASK_HEIGHT + 2 * pad));
  const land = landMask();
  for (let row = 0; row < MASK_HEIGHT; row += 1) {
    mask.set(land.subarray(row * MASK_WIDTH, (row + 1) * MASK_WIDTH), (row + pad) * width + pad);
  }
  return { mask, width, pad };
}
