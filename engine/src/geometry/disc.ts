import type { PixelPoint } from "./pixel-point.js";

/** The hand controller's disc reads 16 directions: 0 is north (up), counting clockwise. */
export type DiscDirection = number;
export type DiscReading = DiscDirection | "released";

export const DISC_RELEASED = "released";
export const DISC_DIRECTIONS = 16;

/** A velocity in the EXEC's units, which sprites carry as whole numbers. */
export interface Velocity {
  readonly x: number;
  readonly y: number;
}

export const STILL: Velocity = { x: 0, y: 0 };

/** A way across the screen or the board, x east and y south: only which way it points counts. */
export interface Way {
  readonly x: number;
  readonly y: number;
}

const RADIANS_PER_DIRECTION = (2 * Math.PI) / DISC_DIRECTIONS;
/** Close enough to a target to let go of the disc; no sprite moves a pixel in one frame. */
const ARRIVAL_PIXELS = 1;
/** A speed at which every slanting direction moves a sprite along both axes; any above 2 would do. */
const SENSING_SPEED = 100;
/**
 * A direction held is kept while the way wanted lies within this many steps of it, a quarter step
 * past where it would round to the next, so a way on the edge between two does not flip the disc
 * from one to the other and back.
 */
const HELD_STEPS = 0.75;

/** X_MOB_VEL: the velocity a pressed disc gives a sprite of the given speed. */
export function discVelocity(reading: DiscReading, speed: number): Velocity {
  if (reading === DISC_RELEASED) return STILL;
  const angle = reading * RADIANS_PER_DIRECTION;
  return {
    x: Math.round(speed * Math.sin(angle)) || 0,
    y: Math.round(-speed * Math.cos(angle)) || 0,
  };
}

/**
 * The disc a player would press to move from one point toward another, released on arrival.
 * Tap-to-move and the computer governor both steer with it, so every move is ordinary disc input.
 */
export function steerToward(from: PixelPoint, to: PixelPoint): DiscReading {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) <= ARRIVAL_PIXELS && Math.abs(dy) <= ARRIVAL_PIXELS) return DISC_RELEASED;
  return discFacing({ x: dx, y: dy });
}

/** The disc direction nearest a way across the screen, given as an offset (x east, y south). */
export function discFacing(offset: Way): DiscDirection {
  return Math.round(discTurns(offset)) % DISC_DIRECTIONS;
}

/** The direction for a way across the screen: the one held, while it is near enough the way. */
export function steadyDiscFacing(wanted: {
  readonly way: Way;
  readonly held: DiscReading;
}): DiscDirection {
  const turns = discTurns(wanted.way);
  const { held } = wanted;
  if (held !== DISC_RELEASED && stepsApart(turns, held) <= HELD_STEPS) return held;
  return Math.round(turns) % DISC_DIRECTIONS;
}

/** How many of the disc's steps lie between two ways, the shorter way round. */
function stepsApart(turns: number, direction: DiscDirection): number {
  const apart = Math.abs(turns - direction) % DISC_DIRECTIONS;
  return Math.min(apart, DISC_DIRECTIONS - apart);
}

/** A way across the screen in the disc's steps, 0 up to 16, clockwise from north. */
export function discTurns(offset: Way): number {
  const turns = Math.atan2(offset.x, -offset.y) / RADIANS_PER_DIRECTION;
  return (turns + DISC_DIRECTIONS) % DISC_DIRECTIONS;
}

/** Which way along each axis a direction drives a sprite: -1, 0 or 1 (x east, y south). */
export function discSense(direction: DiscDirection): Velocity {
  const velocity = discVelocity(direction, SENSING_SPEED);
  return { x: Math.sign(velocity.x), y: Math.sign(velocity.y) };
}
