import { fence, type Spot } from "./path-shapes.js";
import { pseudoRandom } from "./random.js";
import {
  merge,
  placed,
  quads,
  triangles,
  type Corner,
  type Rgb,
  type Triangles,
  type Vec3,
} from "./shapes.js";

/** A boat's hull, its middle at the origin, its bow ahead (+x) and its deck level. */
export interface HullSpec {
  readonly length: number;
  readonly beam: number;
  /** How much of its length its bow takes to curve in to a point: more for a finer bow. */
  readonly bow: number;
  /** How wide its stern is, as a share of its beam. */
  readonly stern: number;
  /** The heights of its keel and its deck, from the waterline. */
  readonly keel: number;
  readonly deck: number;
  /** How wide it is at its keel, as a share of its width at the deck: its sides flare out above. */
  readonly flare: number;
}

/** Where the plan's points lie along the hull, stern to the bow's start; the bow then has its own. */
const STERN_POINTS = [0, 0.15];
const BOW_POINTS = 6;
/** How far the bow's foot is drawn back from its top, as a share of the length: a raked stem. */
const RAKE = 0.12;
const BOW_CURVE = 1.8;
/** The stern widens to the full beam over this share of the length. */
const QUARTER = 0.25;

/**
 * The hull's outline at a height, seen from above: a transom stern, sides running forward and
 * curving in to the bow's point, going anticlockwise from the stern's starboard corner. Lower
 * down it is narrower, for the sides flare out, and its stem is drawn back.
 */
export function hullPlan(plan: { hull: HullSpec; height: number }): Spot[] {
  const { hull } = plan;
  const up = (plan.height - hull.keel) / (hull.deck - hull.keel);
  const half = (hull.beam / 2) * (hull.flare + (1 - hull.flare) * up);
  const bowStart = 1 - hull.bow;
  const alongs = [...STERN_POINTS.map((share) => share * bowStart), ...bowAlongs(bowStart)];
  const starboard = alongs.map((along): Spot => {
    const curve = Math.max(0, (along - bowStart) / hull.bow);
    const x = (along - 0.5) * hull.length - (1 - up) * RAKE * hull.length * curve;
    return [x, half * widthAt({ hull, along, curve })];
  });
  const port = starboard.slice(0, -1).map(([x, z]): Spot => [x, -z]);
  return [...starboard, ...port.reverse()];
}

function bowAlongs(bowStart: number): number[] {
  return Array.from(
    { length: BOW_POINTS },
    (_, step) => bowStart + ((1 - bowStart) * step) / (BOW_POINTS - 1),
  );
}

/** How wide the hull is at a point along it, as a share of its beam. */
function widthAt(point: { hull: HullSpec; along: number; curve: number }): number {
  const quarter = Math.min(1, point.along / QUARTER);
  const stern = point.hull.stern + (1 - point.hull.stern) * quarter;
  return stern * (1 - Math.pow(point.curve, BOW_CURVE));
}

/** The hull's sides between two heights, in one colour: its bottom paint, its topsides, a stripe. */
export function hullBand(band: {
  hull: HullSpec;
  from: number;
  to: number;
  colour: Rgb;
}): Triangles {
  const lower = hullPlan({ hull: band.hull, height: band.from });
  const upper = hullPlan({ hull: band.hull, height: band.to });
  const corners: Corner[] = [
    ...lower.map(([x, z]): Corner => [x, band.from, z]),
    ...upper.map(([x, z]): Corner => [x, band.to, z]),
  ];
  const count = lower.length;
  const faces = lower.map((_, index) => {
    const next = (index + 1) % count;
    return [index, next, count + next, count + index] as const;
  });
  return quads({ corners, faces, colour: band.colour });
}

/** The hull's deck, laid over the whole of it at its deck's height. */
export function hullDeck(deck: { hull: HullSpec; colour: Rgb }): Triangles {
  const { hull } = deck;
  const rim = hullPlan({ hull, height: hull.deck });
  const corners: Corner[] = [[0, hull.deck, 0], ...rim.map(([x, z]): Corner => [x, hull.deck, z])];
  const faces = rim.map((_, index) => [0, index + 1, ((index + 1) % rim.length) + 1] as const);
  return triangles({ corners, faces, colour: deck.colour });
}

export interface RodSpec {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radius: number;
  /** How many flat sides stand in for its round. */
  readonly sides: number;
  readonly colour: Rgb;
}

/** A rod from one point to another, open at its ends: a mast, a yard, a boom, a stay, a gun's barrel. */
export function rod(spec: RodSpec): Triangles {
  const { from, to, radius, sides } = spec;
  const [u, v] = squareTo(direction(from, to));
  const ring = (end: Vec3) =>
    Array.from({ length: sides }, (_, side): Corner => {
      const angle = (side / sides) * Math.PI * 2;
      const [c, s] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
      return [end.x + u.x * c + v.x * s, end.y + u.y * c + v.y * s, end.z + u.z * c + v.z * s];
    });
  const corners = [...ring(from), ...ring(to)];
  const faces = Array.from({ length: sides }, (_, side) => {
    const next = (side + 1) % sides;
    return [side, sides + side, sides + next, next] as const;
  });
  return quads({ corners, faces, colour: spec.colour });
}

function direction(from: Vec3, to: Vec3): Vec3 {
  const [x, y, z] = [to.x - from.x, to.y - from.y, to.z - from.z];
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}

/** Two directions square to one another and to the one given. */
function squareTo(along: Vec3): [Vec3, Vec3] {
  const helper = Math.abs(along.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const u = unit(cross(along, helper));
  return [u, cross(u, along)];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function unit(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export interface SailSpec {
  /** The yard it hangs from, end to end. */
  readonly yard: { readonly from: Vec3; readonly to: Vec3 };
  /** How far it hangs down at most. */
  readonly drop: number;
  /** How much of its drop its foot may be torn away, 0 to 1. */
  readonly ragged: number;
  /** How far the wind fills it out ahead (+x) at its middle. */
  readonly belly: number;
  readonly seed: number;
  readonly colour: Rgb;
}

/** Strips across a sail, and its rows from the yard down. */
const SAIL_COLUMNS = 4;
const SAIL_ROWS = [0, 0.5, 1];

/** A square sail hanging from its yard, filled by the wind and torn ragged along its foot, seen from either side. */
export function sail(spec: SailSpec): Triangles {
  const rows = SAIL_ROWS.map((down) =>
    Array.from({ length: SAIL_COLUMNS + 1 }, (_, column) => sailPoint({ spec, down, column })),
  );
  const strips = rows.slice(1).flatMap((lower, row) =>
    lower.slice(1).map((_, column) => {
      const corners = [rows[row][column], rows[row][column + 1], lower[column + 1], lower[column]];
      return quads({
        corners,
        faces: [
          [0, 1, 2, 3],
          [1, 0, 3, 2],
        ],
        colour: spec.colour,
      });
    }),
  );
  return merge(strips);
}

function sailPoint(point: { spec: SailSpec; down: number; column: number }): Corner {
  const { spec, down, column } = point;
  const across = column / SAIL_COLUMNS;
  const { from, to } = spec.yard;
  const torn = down === 1 ? spec.ragged * pseudoRandom(spec.seed * 31 + column * 7.7) : 0;
  const fill = Math.sin(Math.PI * across) * Math.sin(Math.PI * Math.min(1, down * 0.9 + 0.1));
  return [
    from.x + (to.x - from.x) * across + spec.belly * fill * (down > 0 ? 1 : 0),
    from.y + (to.y - from.y) * across - spec.drop * down * (1 - torn),
    from.z + (to.z - from.z) * across,
  ];
}

/** A flag flying aft from its hoist, seen from either side. */
export function flag(spec: {
  hoist: Vec3;
  length: number;
  height: number;
  colour: Rgb;
}): Triangles {
  const bunting = fence({
    path: [
      [0, 0],
      [-spec.length, 0],
    ],
    height: spec.height,
    colour: spec.colour,
  });
  return placed(bunting, { offset: spec.hoist, turn: 0 });
}
