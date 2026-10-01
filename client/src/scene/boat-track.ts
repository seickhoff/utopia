import { CARD_PIXELS } from "@utopia/engine";
import type { WorldPoint } from "../board/rom-space.js";

/** One of the cartridge's pixels on the floor, which measures in cards. */
const PIXEL = 1 / CARD_PIXELS;
/** How far back a boat's way is judged from: half a second, enough to see a slow pirate move. */
const WAY_FRAMES = 30;
/** Moved at least this far over that time, along the way it is driven, a boat is under way. */
const LEAST_WAY = PIXEL;
/** How much of the way to its sprite the drawn boat goes each frame, so a shove eases. */
const EASE = 0.3;
/** Further than this from where it was drawn, a boat has been put somewhere new. */
const LONGEST_EASE = 4 * PIXEL;

/** Where a boat's sprite is this frame, and which way its disc (or its drift) drives it. */
export interface Sighting {
  readonly centre: WorldPoint;
  readonly velocity: { readonly vx: number; readonly vy: number };
}

/**
 * How a boat on the diorama really moves, so it is drawn by its track and not by its disc. A sand
 * bar's one-pixel shove back from the shore eases in rather than jumps. The boat is under way, and
 * turns, only by the way it has gone along the axes its disc drives it: a shove back, or a disc
 * pressed against the edge of the sea, neither turns it nor raises a wake.
 */
export class BoatTrack {
  private readonly pastX = new Float64Array(WAY_FRAMES);
  private readonly pastZ = new Float64Array(WAY_FRAMES);
  /** The slot of the oldest place remembered, and so the next to be written over. */
  private oldest = 0;
  private drawnX = 0;
  private drawnZ = 0;
  private lost = true;
  private underWay = false;
  private heading = 0;

  follow(sighting: Sighting): void {
    const { centre } = sighting;
    if (this.lost || this.isFarFrom(centre)) this.settleAt(centre);
    this.drawnX += (centre.x - this.drawnX) * EASE;
    this.drawnZ += (centre.z - this.drawnZ) * EASE;
    this.judgeWay(sighting);
    this.pastX[this.oldest] = centre.x;
    this.pastZ[this.oldest] = centre.z;
    this.oldest = (this.oldest + 1) % WAY_FRAMES;
  }

  /** The boat has gone from sight: wherever it is next seen, it is drawn there at once. */
  lose(): void {
    this.lost = true;
  }

  x(): number {
    return this.drawnX;
  }

  z(): number {
    return this.drawnZ;
  }

  isUnderWay(): boolean {
    return this.underWay;
  }

  /** The way it last went, as a turn about the vertical: 0 is east, a quarter turn north. */
  bearing(): number {
    return this.heading;
  }

  private isFarFrom(centre: WorldPoint): boolean {
    return Math.hypot(centre.x - this.drawnX, centre.z - this.drawnZ) > LONGEST_EASE;
  }

  private settleAt(centre: WorldPoint): void {
    this.drawnX = centre.x;
    this.drawnZ = centre.z;
    this.pastX.fill(centre.x);
    this.pastZ.fill(centre.z);
    this.lost = false;
  }

  private judgeWay(sighting: Sighting): void {
    const { centre, velocity } = sighting;
    const across = alongDisc(centre.x - this.pastX[this.oldest], velocity.vx);
    const down = alongDisc(centre.z - this.pastZ[this.oldest], velocity.vy);
    this.underWay = Math.hypot(across, down) >= LEAST_WAY;
    if (this.underWay) this.heading = Math.atan2(-down || 0, across);
  }
}

/** The part of a move made the way the boat is driven: a shove back from the shore is not way. */
function alongDisc(moved: number, velocity: number): number {
  return Math.sign(moved) === Math.sign(velocity) ? moved : 0;
}
