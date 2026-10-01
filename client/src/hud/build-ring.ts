/**
 * The quick-build menu as a ring round the clicked square, so every choice is a short move away.
 * Each choice owns the whole wedge of the ring around it: the pointer only has to head toward a
 * tile, not land on it. Page pixels throughout, y downward.
 */

/** From the square to the middle of each choice's tile. */
export const RING_RADIUS = 104;
export const TILE_SIZE = 64;
/** Closer to the middle than this, the pointer aims at nothing. */
export const HUB_RADIUS = 30;
/** How far out the wedges reach; past it, a click closes the menu. */
export const REACH = RING_RADIUS + 90;
/** How far the ring and its tiles reach from the middle, every way. */
export const RING_EXTENT = RING_RADIUS + TILE_SIZE / 2;
const PAGE_MARGIN = 8;
const FULL_TURN = 2 * Math.PI;

export interface Offset {
  readonly x: number;
  readonly y: number;
}

/** Where a choice's tile sits, from the middle: the first straight up, the rest clockwise. */
export function slotOffset(place: { slot: number; count: number }): Offset {
  const angle = (place.slot / place.count) * FULL_TURN;
  return { x: Math.sin(angle) * RING_RADIUS, y: -Math.cos(angle) * RING_RADIUS };
}

/** Which choice a pointer this far from the middle heads toward, if any. */
export function aimedSlot(aim: { offset: Offset; count: number }): number | "hub" | "beyond" {
  const { offset, count } = aim;
  const distance = Math.hypot(offset.x, offset.y);
  if (distance < HUB_RADIUS) return "hub";
  if (distance > REACH) return "beyond";
  const clockwise = (Math.atan2(offset.x, -offset.y) + FULL_TURN) % FULL_TURN;
  return Math.round((clockwise / FULL_TURN) * count) % count;
}

/** The middle of the ring: on the click, moved in just enough to keep the ring on the page. */
export function ringCentre(at: {
  anchor: Offset;
  page: { width: number; height: number };
}): Offset {
  const inset = RING_EXTENT + PAGE_MARGIN;
  const within = (value: number, size: number) =>
    Math.min(Math.max(value, inset), Math.max(inset, size - inset));
  return { x: within(at.anchor.x, at.page.width), y: within(at.anchor.y, at.page.height) };
}
