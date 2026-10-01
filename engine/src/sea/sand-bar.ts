import type { Board } from "../board/board.js";
import type { SquareContent } from "../board/square-content.js";
import { squareUnder } from "../geometry/pixel-point.js";
import { GRID_COLUMNS, type Square } from "../geometry/square.js";
import type { Body } from "./body.js";

/** Who is sailing decides what counts as shore: pirates steer clear of anchored PT boats. */
export type Seafarer = "vessel" | "pirate";

export interface Shore {
  readonly board: Board;
  readonly seafarer: Seafarer;
}

/** The ROM's clamp on nudges: it never pushes a sprite back past these coordinates. */
const NEAR_EDGE = 8;
const FAR_EDGE = 160;

/**
 * The invisible "sand bars" (L_5320): looking one card ahead on each axis it is moving along, a
 * boat about to run aground is nudged back a pixel and stopped on that axis. Only a new press of
 * the disc sets it going again, so a boat can slide along a shore but never sail straight in.
 */
export function holdOffShore(body: Body, shore: Shore): void {
  const square = squareUnder(body.point());
  const velocity = body.velocity();
  if (velocity.x !== 0 && isShore(shore, square.shiftedBy(Math.sign(velocity.x)))) {
    nudgeBack(body, { axis: "x", heading: velocity.x });
  }
  if (velocity.y !== 0 && isShore(shore, square.shiftedBy(Math.sign(velocity.y) * GRID_COLUMNS))) {
    nudgeBack(body, { axis: "y", heading: velocity.y });
  }
}

function isShore(shore: Shore, ahead: Square): boolean {
  if (!ahead.isOnGrid()) return false;
  const content = shore.board.contentAt(ahead);
  return blocksVessels(content) || (shore.seafarer === "pirate" && content.occupant === "ptBoat");
}

/** Land, whatever stands on it, and a boat going down; anchored boats can be sailed past. */
export function blocksVessels(content: SquareContent): boolean {
  return content.terrain === "land" || content.occupant === "wreck";
}

interface Grounding {
  readonly axis: "x" | "y";
  readonly heading: number;
}

function nudgeBack(body: Body, grounding: Grounding): void {
  const position = body.point()[grounding.axis];
  const back = grounding.heading > 0 ? position > NEAR_EDGE : position < FAR_EDGE;
  const step = back ? -Math.sign(grounding.heading) : 0;
  body.shift(grounding.axis === "x" ? { x: step, y: 0 } : { x: 0, y: step });
  const velocity = body.velocity();
  body.setVelocity(grounding.axis === "x" ? { ...velocity, x: 0 } : { ...velocity, y: 0 });
}
