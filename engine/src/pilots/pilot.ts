import type { Board } from "../board/board.js";
import type { BoatKind } from "../board/item-kind.js";
import type { Footprint } from "../collision/sprite-shape.js";
import { STILL, discVelocity, type DiscReading, type Velocity } from "../geometry/disc.js";
import type { PixelPoint } from "../geometry/pixel-point.js";
import { Animation } from "../sea/animation.js";
import { Body, type Bounds } from "../sea/body.js";
import { holdOffShore } from "../sea/sand-bar.js";
import { SPRITE_LOOKS, shapeOf } from "../sea/sprite-looks.js";
import { CURSOR, sailing, sinking, type PilotMode, type PilotSpeeds } from "./pilot-mode.js";

export interface PilotSetup {
  readonly start: PixelPoint;
  readonly speeds: PilotSpeeds;
}

/** A pilot keeps to the sea's 20 x 11 cards, never the status row (ROM bug: boats drifted in). */
export const PILOT_BOUNDS: Bounds = { left: 8, top: 8, right: 160, bottom: 88 };

/** A governor's own sprite: the square cursor, or the boat they have taken out. */
export class Pilot {
  private readonly body: Body;
  private current: PilotMode = CURSOR;
  private facingLeft = false;
  private sinkingAnimation = new Animation(SPRITE_LOOKS.sinkingBoat);

  constructor(private readonly setup: PilotSetup) {
    this.body = Body.at(setup.start);
  }

  mode(): PilotMode {
    return this.current;
  }

  point(): PixelPoint {
    return this.body.point();
  }

  velocity(): Velocity {
    return this.body.velocity();
  }

  isMirrored(): boolean {
    return this.facingLeft;
  }

  frame(): number {
    return this.current.name === "sinking" ? this.sinkingAnimation.frame() : 0;
  }

  footprint(): Footprint {
    const { x, y } = this.body.point();
    const shape = shapeOf(SPRITE_LOOKS[this.current.look], this.frame());
    return { x, y, shape, mirrored: this.facingLeft };
  }

  /** The EXEC only sets a velocity when the disc changes, so a sprite keeps it until then. */
  pressDisc(reading: DiscReading): void {
    if (this.current.isAdrift) return;
    this.body.setVelocity(discVelocity(reading, this.current.speedFrom(this.setup.speeds)));
  }

  move(subpixelsPerUnit: number): void {
    if (this.current.isAdrift) return;
    this.body.move(subpixelsPerUnit);
    this.body.clampTo(PILOT_BOUNDS);
  }

  /** A boat under way turns to face its heading and keeps off the shore; the cursor flies free. */
  steerClear(board: Board): void {
    if (this.current.name !== "sailing") return;
    const { x } = this.body.velocity();
    if (x !== 0) this.facingLeft = x < 0;
    holdOffShore(this.body, { board, seafarer: "vessel" });
  }

  /** Puts the pilot where its governor's own screen shows it (online play). */
  lay(point: PixelPoint): void {
    this.body.placeAt(point);
    this.body.clampTo(PILOT_BOUNDS);
  }

  takeBoat(boat: BoatKind): void {
    this.current = sailing(boat);
  }

  /**
   * Drops anchor and hands the governor back the cursor, at rest. A fix: on the cartridge the
   * cursor kept the boat's way on it and drifted off until the disc was next touched.
   */
  anchor(): void {
    this.current = CURSOR;
    this.body.setVelocity({ x: 0, y: 0 });
  }

  sink(): void {
    this.current = sinking(this.current.aboard);
    this.sinkingAnimation = new Animation(SPRITE_LOOKS.sinkingBoat);
    this.body.setVelocity(STILL);
  }

  tick(): void {
    if (this.current.name === "sinking") this.sinkingAnimation.tick();
  }

  hasGoneDown(): boolean {
    return this.current.name === "sinking" && this.sinkingAnimation.hasPlayedOnce();
  }

  respawn(): void {
    this.current = CURSOR;
    this.facingLeft = false;
    this.body.placeAt(this.setup.start);
    this.body.setVelocity(STILL);
  }
}
