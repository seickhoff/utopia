import type { KitStyle } from "./kit-style.js";
import type { Triangles } from "./shapes.js";

/** The band's edges, from the boat's middle in squares: clear of the boat, short of its neighbours. */
const INNER_RADIUS = 0.58;
const OUTER_RADIUS = 0.64;
/** Enough segments that the band reads as a circle, not a polygon. */
const SEGMENTS = 48;
const FULL_TURN = 2 * Math.PI;

/**
 * The ring round the boat a governor is steering, in their colour: one thin flat band on the water,
 * a hint that this boat is the one under their hand, not a thing on the sea in its own right.
 */
export function pilotRing(style: KitStyle): Triangles {
  const positions = Array.from({ length: SEGMENTS }, (_, step) => bandSegment(step)).flat();
  return { positions, colors: positions.map((_, at) => style.accent[at % 3]) };
}

/** One segment of the band as two triangles, wound to face up. */
function bandSegment(step: number): number[] {
  const inner = (at: number) => pointOnCircle({ radius: INNER_RADIUS, step: at });
  const outer = (at: number) => pointOnCircle({ radius: OUTER_RADIUS, step: at });
  return [
    ...inner(step),
    ...outer(step + 1),
    ...outer(step),
    ...inner(step),
    ...inner(step + 1),
    ...outer(step + 1),
  ];
}

function pointOnCircle(at: { radius: number; step: number }): number[] {
  const turn = (at.step / SEGMENTS) * FULL_TURN;
  return [Math.cos(turn) * at.radius, 0, Math.sin(turn) * at.radius];
}
