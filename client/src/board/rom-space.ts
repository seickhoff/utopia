import { CARD_PIXELS, GRID_COLUMNS, PixelPoint, STATUS_ROW } from "@utopia/engine";

/**
 * The diorama's floor is the playfield: one card is one world unit, the sea's 20 x 11 cards
 * centred on the origin, x east and z south (y is up).
 */
export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

export const BOARD_WIDTH = GRID_COLUMNS;
export const BOARD_DEPTH = STATUS_ROW;

/** Sprite coordinates start 8 pixels above and left of the screen's first pixel. */
const MOB_ORIGIN = 8;
const HALF_WIDTH = BOARD_WIDTH / 2;
const HALF_DEPTH = BOARD_DEPTH / 2;

/** A size in pixels, for finding a sprite's centre. */
export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

export const CARD_SIZE: PixelSize = { width: CARD_PIXELS, height: CARD_PIXELS };

/** Where the centre of a sprite of this size, at this sprite point, stands on the floor. */
export function worldOfSprite(point: { x: number; y: number }, size: PixelSize): WorldPoint {
  return {
    x: (point.x - MOB_ORIGIN + size.width / 2) / CARD_PIXELS - HALF_WIDTH,
    z: (point.y - MOB_ORIGIN + size.height / 2) / CARD_PIXELS - HALF_DEPTH,
  };
}

/** Where a screen pixel (0-159 across, 0-87 down) stands on the floor. */
export function worldOfScreenPixel(pixel: { x: number; y: number }): WorldPoint {
  return { x: pixel.x / CARD_PIXELS - HALF_WIDTH, z: pixel.y / CARD_PIXELS - HALF_DEPTH };
}

/** The sprite point at which an 8x8 sprite is centred over a point of the floor. */
export function spriteOverWorld(world: WorldPoint): PixelPoint {
  const x = (world.x + HALF_WIDTH) * CARD_PIXELS + MOB_ORIGIN - CARD_PIXELS / 2;
  const y = (world.z + HALF_DEPTH) * CARD_PIXELS + MOB_ORIGIN - CARD_PIXELS / 2;
  return new PixelPoint(Math.round(x), Math.round(y));
}

/** Whether a point of the floor lies over the sea's 20 x 11 cards. */
export function isOnBoard(world: WorldPoint): boolean {
  return Math.abs(world.x) < HALF_WIDTH && Math.abs(world.z) < HALF_DEPTH;
}

/** A point beyond the board comes back to the middle of the edge cards, so a sprite there is on them. */
const EDGE_INSET = 0.5;

/** The point on the sea's cards nearest to a point of the floor: itself, if it is on them. */
export function nearestOnBoard(world: WorldPoint): WorldPoint {
  const within = (value: number, half: number) =>
    Math.min(half - EDGE_INSET, Math.max(-half + EDGE_INSET, value));
  return { x: within(world.x, HALF_WIDTH), z: within(world.z, HALF_DEPTH) };
}
