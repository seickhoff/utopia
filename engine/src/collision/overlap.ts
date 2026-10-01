import {
  MASK_BITS,
  SCANLINES_PER_PIXEL,
  scanlineMask,
  scanlinesOf,
  type Footprint,
} from "./sprite-shape.js";
import { SCREEN_WIDTH, type Playfield } from "./playfield.js";

/** The STIC sees collisions only on the visible screen: 160 pixels by 192 scanlines. */
const SCREEN_SCANLINES = 192;
const MOB_ORIGIN = 8;
const TOP_BIT = 1 << (MASK_BITS - 1);

/** Whether two sprites' lit pixels overlap anywhere on the screen (MOB-MOB collision). */
export function footprintsTouch(a: Footprint, b: Footprint): boolean {
  const dx = leftOf(b) - leftOf(a);
  if (Math.abs(dx) >= MASK_BITS) return false;
  const top = Math.max(topOf(a), topOf(b), 0);
  const bottom = Math.min(bottomOf(a), bottomOf(b), SCREEN_SCANLINES);
  for (let scanline = top; scanline < bottom; scanline += 1) {
    const maskA = visibleMask(a, scanline);
    const maskB = visibleMask(b, scanline);
    if (dx >= 0 ? maskA & (maskB >>> dx) : (maskA >>> -dx) & maskB) return true;
  }
  return false;
}

/** Whether a sprite's lit pixels lie over the background's foreground (MOB-background collision). */
export function touchesForeground(footprint: Footprint, playfield: Playfield): boolean {
  const top = Math.max(topOf(footprint), 0);
  const bottom = Math.min(bottomOf(footprint), SCREEN_SCANLINES);
  for (let scanline = top; scanline < bottom; scanline += 1) {
    const mask = visibleMask(footprint, scanline);
    const y = Math.floor(scanline / SCANLINES_PER_PIXEL);
    if (mask !== 0 && rowTouches(playfield, { mask, left: leftOf(footprint), y })) return true;
  }
  return false;
}

interface MaskRow {
  readonly mask: number;
  readonly left: number;
  readonly y: number;
}

function rowTouches(playfield: Playfield, row: MaskRow): boolean {
  for (let column = 0; column < MASK_BITS; column += 1) {
    const lit = row.mask & (TOP_BIT >>> column);
    if (lit && playfield.isForeground({ x: row.left + column, y: row.y })) return true;
  }
  return false;
}

/** A scanline's mask with any pixels off the sides of the screen cleared. */
function visibleMask(footprint: Footprint, scanline: number): number {
  const mask = scanlineMask(footprint, scanline - topOf(footprint));
  const left = leftOf(footprint);
  let visible = mask;
  for (let column = 0; column < MASK_BITS; column += 1) {
    const x = left + column;
    if (x < 0 || x >= SCREEN_WIDTH) visible &= ~(TOP_BIT >>> column);
  }
  return visible;
}

function leftOf(footprint: Footprint): number {
  return footprint.x - MOB_ORIGIN;
}

function topOf(footprint: Footprint): number {
  return (footprint.y - MOB_ORIGIN) * SCANLINES_PER_PIXEL;
}

function bottomOf(footprint: Footprint): number {
  return topOf(footprint) + scanlinesOf(footprint.shape);
}
