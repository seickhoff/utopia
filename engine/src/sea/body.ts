import { STILL, type Velocity } from "../geometry/disc.js";
import { PixelPoint } from "../geometry/pixel-point.js";

/**
 * Positions are kept in fine units: the EXEC's 8.8 fixed point (256ths of a pixel), cut three
 * ways more so that its once-a-tick moves can be spread smoothly over the tick's three frames.
 */
export const FINE_UNITS_PER_PIXEL = 768;

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The four ways the cartridge nudges a drifting sprite: rand(4) of 0 north, 1 south, 2 west, 3 east. */
const NUDGES: readonly Velocity[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

/** Anything that moves on the sea: its position and its velocity in EXEC units. */
export class Body {
  private heading: Velocity = STILL;

  private constructor(
    private x: number,
    private y: number,
  ) {}

  static at(point: PixelPoint): Body {
    return new Body(point.x * FINE_UNITS_PER_PIXEL, point.y * FINE_UNITS_PER_PIXEL);
  }

  point(): PixelPoint {
    return new PixelPoint(
      Math.floor(this.x / FINE_UNITS_PER_PIXEL),
      Math.floor(this.y / FINE_UNITS_PER_PIXEL),
    );
  }

  velocity(): Velocity {
    return this.heading;
  }

  setVelocity(velocity: Velocity): void {
    this.heading = velocity;
  }

  /** One frame's travel, given how many fine units a unit of velocity covers in a frame. */
  move(finePerUnit: number): void {
    this.x += this.heading.x * finePerUnit;
    this.y += this.heading.y * finePerUnit;
  }

  nudge(direction: number): void {
    const nudge = NUDGES[direction];
    this.heading = { x: this.heading.x + nudge.x, y: this.heading.y + nudge.y };
  }

  /** Moves by whole pixels, as the sand bars nudge a boat back from the shore. */
  shift(offset: Velocity): void {
    this.x += offset.x * FINE_UNITS_PER_PIXEL;
    this.y += offset.y * FINE_UNITS_PER_PIXEL;
  }

  placeAt(point: PixelPoint): void {
    this.x = point.x * FINE_UNITS_PER_PIXEL;
    this.y = point.y * FINE_UNITS_PER_PIXEL;
  }

  clampTo(bounds: Bounds): void {
    const point = this.point();
    const x = Math.min(bounds.right, Math.max(bounds.left, point.x));
    const y = Math.min(bounds.bottom, Math.max(bounds.top, point.y));
    if (x !== point.x) this.x = x * FINE_UNITS_PER_PIXEL;
    if (y !== point.y) this.y = y * FINE_UNITS_PER_PIXEL;
  }
}
