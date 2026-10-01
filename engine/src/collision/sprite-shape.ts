/**
 * A sprite's picture as the STIC draws it: 8 or 16 rows of 8 bits, each row 1, 2 or 4 scanlines
 * tall (a scanline is half a background pixel), and each bit one or two pixels wide.
 */
export interface SpriteShape {
  readonly rows: readonly number[];
  readonly scanlinesPerRow: number;
  readonly pixelsPerBit: 1 | 2;
}

/** A sprite placed on the screen: its shape, where it is and which way it faces. */
export interface Footprint {
  /** Sprite (MOB) coordinates: (8, 8) is the screen's top-left pixel. */
  readonly x: number;
  readonly y: number;
  readonly shape: SpriteShape;
  readonly mirrored: boolean;
}

export const SCANLINES_PER_PIXEL = 2;
export const MASK_BITS = 16;
const BITS_PER_ROW = 8;

export function scanlinesOf(shape: SpriteShape): number {
  return shape.rows.length * shape.scanlinesPerRow;
}

/** One scanline of a placed sprite as a 16-bit mask, its leftmost pixel in bit 15. */
export function scanlineMask(footprint: Footprint, scanline: number): number {
  const { shape } = footprint;
  const row = shape.rows[Math.floor(scanline / shape.scanlinesPerRow)] ?? 0;
  const facing = footprint.mirrored ? reversed(row) : row;
  return shape.pixelsPerBit === 2 ? doubled(facing) : facing << BITS_PER_ROW;
}

function reversed(row: number): number {
  let bits = 0;
  for (let bit = 0; bit < BITS_PER_ROW; bit += 1) {
    bits |= ((row >> bit) & 1) << (BITS_PER_ROW - 1 - bit);
  }
  return bits;
}

/** Each bit twice over, for a double-width sprite. */
function doubled(row: number): number {
  let bits = 0;
  for (let bit = 0; bit < BITS_PER_ROW; bit += 1) bits |= ((row >> bit) & 1) * (3 << (bit * 2));
  return bits;
}
