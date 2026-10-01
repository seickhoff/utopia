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

const RADIANS_PER_DIRECTION = (2 * Math.PI) / DISC_DIRECTIONS;
/** Close enough to a target to let go of the disc; no sprite moves a pixel in one frame. */
const ARRIVAL_PIXELS = 1;

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
  const turns = Math.atan2(dx, -dy) / RADIANS_PER_DIRECTION;
  return (Math.round(turns) + DISC_DIRECTIONS) % DISC_DIRECTIONS;
}
