import { COLOURS, PALETTE, type Side } from "@utopia/engine";

/** Each governor's colour: the left island dark green, the right red, as on the cartridge. */
export const SIDE_COLOURS: Readonly<Record<Side, number>> = {
  left: COLOURS.darkGreen,
  right: COLOURS.red,
};

const OPAQUE = 0xff;

/**
 * A "#rrggbb" colour as one 32-bit word of canvas ImageData, which is laid out R, G, B, A in
 * memory: on a little-endian machine that reads back as 0xAABBGGRR.
 */
export function pixelWord(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return ((OPAQUE << 24) | (blue << 16) | (green << 8) | red) >>> 0;
}

/** The Intellivision palette as ImageData words, indexed like the STIC's colours. */
export const PALETTE_WORDS: readonly number[] = PALETTE.map(pixelWord);
