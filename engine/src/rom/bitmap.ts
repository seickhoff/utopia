const LIT = "#";

/** A picture's rows as bits, with the leftmost pixel in bit 7 (as the STIC reads GRAM). */
export function bitRows(picture: string): number[] {
  return picture
    .split("/")
    .map((row) => [...row].reduce((bits, pixel) => (bits << 1) | (pixel === LIT ? 1 : 0), 0));
}

/** Card numbers the cartridge draws specially. */
export const SOLID_LAND_CARD = 0x00;
export const PT_BOAT_CARD = 0x08;
export const FISHING_BOAT_CARD = 0x09;
/** A sinking anchored boat's frame N shows card $0A + N (SNKFRM). */
export const SINKING_CARD_BASE = 0x0a;
