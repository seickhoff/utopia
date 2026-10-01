import {
  DISC_DIRECTIONS,
  DISC_RELEASED,
  discFacing,
  discSense,
  discTurns,
  steerToward,
  type DiscDirection,
  type DiscReading,
} from "../geometry/disc.js";
import { squareAnchor, squareUnder, type PixelPoint } from "../geometry/pixel-point.js";
import { GRID_COLUMNS, type Square } from "../geometry/square.js";
import type { Passage, Waters } from "./sea-chart.js";

/**
 * How far on along its line a boat is aimed: two cards, so a boat a pixel or two off its line
 * keeps its heading, and one further off turns back to it a single step of the disc.
 */
const LOOK_AHEAD_PIXELS = 16;
/**
 * A heading held is kept while the way to the aim lies within this many of the disc's steps of it,
 * a quarter step past where it would round to the next. A boat moves by whole pixels, so a slanting
 * one seems now on, now a pixel off, its line; at the edge of a turn it would flip back and forth.
 */
const HELD_STEPS = 0.75;

/** The leg a boat is sailing: from the square it set out from to the square it makes for. */
export interface Leg {
  readonly passage: Passage;
  /** What the sand bars turn a boat back from. */
  readonly shore: Pick<Waters, "isShore">;
  /** The disc as it is held now. */
  readonly held: DiscReading;
}

interface Line {
  /** Where a boat sits to cover the square the leg makes for. */
  readonly through: PixelPoint;
  /** The way the leg runs, one pixel long. */
  readonly unit: { readonly x: number; readonly y: number };
}

/**
 * The disc that keeps a boat on its leg. It is aimed a little way on along the line through the
 * squares ahead, not at the next square itself, so a straight run takes one heading: the disc has
 * only 16, and aiming at a point close by turns it from one to the next and back. A turn back to
 * the line that the sand bars would stop is not made; the boat holds the leg's own heading.
 */
export function steerAlong(boat: PixelPoint, leg: Leg): DiscReading {
  const { from, to } = leg.passage;
  if (from === to) return steerToward(boat, squareAnchor(to));
  const line = lineOf(leg.passage);
  const heading = headingFor({ turns: discTurns(aimAlong(boat, line)), held: leg.held });
  if (!wouldRunAground({ heading, from, shore: leg.shore })) return heading;
  return discFacing(line.unit);
}

/** Where to bring a boat in the square it is over, and what the sand bars turn it back from. */
export interface Mooring {
  readonly target: PixelPoint;
  readonly shore: Pick<Waters, "isShore">;
}

/**
 * The disc that brings a boat onto a point in the square it is over, let go once it is there. It
 * is let go short of the point, too, rather than pressed toward shore: the sand bars look a card
 * on from the boat's own square, and would shove it back from the shore beside it.
 */
export function steerWithin(boat: PixelPoint, mooring: Mooring): DiscReading {
  const reading = steerToward(boat, mooring.target);
  if (reading === DISC_RELEASED) return reading;
  const bearing = { heading: reading, from: squareUnder(boat), shore: mooring.shore };
  return wouldRunAground(bearing) ? DISC_RELEASED : reading;
}

/** The heading held, while it is near enough the way to the aim; otherwise the nearest to it. */
function headingFor(aim: { turns: number; held: DiscReading }): DiscDirection {
  const { turns, held } = aim;
  if (held !== DISC_RELEASED && stepsApart(turns, held) <= HELD_STEPS) return held;
  return Math.round(turns) % DISC_DIRECTIONS;
}

/** How many of the disc's steps lie between two ways, the shorter way round. */
function stepsApart(turns: number, direction: DiscDirection): number {
  const apart = Math.abs(turns - direction) % DISC_DIRECTIONS;
  return Math.min(apart, DISC_DIRECTIONS - apart);
}

function lineOf(passage: Passage): Line {
  const across = passage.to.col - passage.from.col;
  const down = passage.to.row - passage.from.row;
  const length = Math.hypot(across, down);
  return { through: squareAnchor(passage.to), unit: { x: across / length, y: down / length } };
}

/** The way from the boat to the point a look-ahead on from it along the line. */
function aimAlong(boat: PixelPoint, line: Line): { x: number; y: number } {
  const { through, unit } = line;
  const along = (boat.x - through.x) * unit.x + (boat.y - through.y) * unit.y;
  const ahead = along + LOOK_AHEAD_PIXELS;
  return { x: through.x + unit.x * ahead - boat.x, y: through.y + unit.y * ahead - boat.y };
}

interface Bearing {
  readonly heading: DiscDirection;
  readonly from: Square;
  readonly shore: Pick<Waters, "isShore">;
}

/**
 * Whether the sand bars, looking one card on along each axis it moves on, would stop it. A turn
 * back to a straight leg's line never takes the boat's middle out of the leg's row or column, so
 * the leg's first square stands for wherever the boat is along it.
 */
function wouldRunAground(bearing: Bearing): boolean {
  const { heading, from, shore } = bearing;
  const sense = discSense(heading);
  const across = sense.x !== 0 && shore.isShore(from.shiftedBy(sense.x));
  const down = sense.y !== 0 && shore.isShore(from.shiftedBy(sense.y * GRID_COLUMNS));
  return across || down;
}
