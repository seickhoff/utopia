import type { Footprint } from "../collision/sprite-shape.js";
import { STILL, type Velocity } from "../geometry/disc.js";
import type { PixelPoint } from "../geometry/pixel-point.js";
import { Animation } from "./animation.js";
import { Body } from "./body.js";
import { holdOffShore, type Shore } from "./sand-bar.js";
import { SPRITE_LOOKS, shapeOf, type LookName } from "./sprite-looks.js";
import type { WeatherKind } from "./weather-kind.js";

/** What drifts across the sea by itself: weather, pirate ships and schools of fish. */
export type DrifterKind = WeatherKind | "pirate" | "fish";

export interface Launch {
  readonly kind: DrifterKind;
  readonly at: PixelPoint;
  readonly velocity: Velocity;
}

/** A drifter is gone once any part of it has left the sprite coordinates' range. */
const OFF_SCREEN = { left: 0, top: 0, right: 167, bottom: 103 };

/**
 * The fastest a drifter may go. A fix: the cartridge's random nudges (L_520D) have no limit, so
 * over a minute or so fish and pirates wandered faster than the boats (speed 10) and could never
 * be caught. Fish now stay slower than a fishing boat, and pirates slower than a PT boat. The
 * weather keeps the cartridge's unbounded wander; it soon blows off the screen.
 */
const TOP_SPEEDS: Readonly<Record<DrifterKind, number>> = {
  rain: Infinity,
  storm: Infinity,
  hurricane: Infinity,
  pirate: 8,
  fish: 7,
};

export class Drifter {
  private readonly body: Body;
  private look: LookName;
  private animation: Animation;
  private facingLeft = false;

  constructor(
    readonly id: number,
    readonly launch: Launch,
  ) {
    this.body = Body.at(launch.at);
    this.body.setVelocity(launch.velocity);
    this.look = launch.kind;
    this.animation = new Animation(SPRITE_LOOKS[this.look]);
  }

  get kind(): DrifterKind {
    return this.launch.kind;
  }

  point(): PixelPoint {
    return this.body.point();
  }

  velocity(): Velocity {
    return this.body.velocity();
  }

  lookName(): LookName {
    return this.look;
  }

  frame(): number {
    return this.animation.frame();
  }

  isMirrored(): boolean {
    return this.facingLeft;
  }

  footprint(): Footprint {
    const { x, y } = this.body.point();
    const shape = shapeOf(SPRITE_LOOKS[this.look], this.animation.frame());
    return { x, y, shape, mirrored: this.facingLeft };
  }

  move(subpixelsPerUnit: number): void {
    if (!this.isSinking()) this.body.move(subpixelsPerUnit);
  }

  /** A random nudge to its velocity, turned down if it would take it past its top speed. */
  nudge(direction: number): void {
    const before = this.body.velocity();
    this.body.nudge(direction);
    const { x, y } = this.body.velocity();
    if (Math.hypot(x, y) > TOP_SPEEDS[this.kind]) this.body.setVelocity(before);
  }

  /** A PT boat across its bows stops a pirate dead (L_5640). */
  halt(): void {
    this.body.setVelocity(STILL);
  }

  /** Turns to face the way it is heading, then keeps off the shore (the timer task's pass). */
  steerClear(shore: Shore): void {
    const { x } = this.body.velocity();
    if (x !== 0) this.facingLeft = x < 0;
    holdOffShore(this.body, shore);
  }

  sink(): void {
    this.look = "sinkingPirate";
    this.animation = new Animation(SPRITE_LOOKS[this.look]);
    this.body.setVelocity(STILL);
  }

  isSinking(): boolean {
    return this.look === "sinkingPirate";
  }

  tick(): void {
    this.animation.tick();
  }

  isGone(): boolean {
    const { x, y } = this.body.point();
    const offScreen = x < OFF_SCREEN.left || x > OFF_SCREEN.right || y < OFF_SCREEN.top;
    const sunk = this.isSinking() && this.animation.hasPlayedOnce();
    return offScreen || y > OFF_SCREEN.bottom || sunk;
  }
}
