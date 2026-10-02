import { curve } from "../path-shapes.js";
import { pseudoRandom } from "../random.js";
import { hipRoof } from "../roof-shapes.js";
import { disc } from "../round-shapes.js";
import { gableRoof, rgb, type Rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { driveway, home, parkedCar, type HomeSpec, type RoofShape } from "./homes.js";
import { CAR_COLOURS, DECAL_LIFT, car, point, road, tree, type Spot } from "./props.js";

const WALLS: readonly Rgb[] = [rgb("#f1efe9"), rgb("#e9e1cf"), rgb("#d9dcdf"), rgb("#e6d5bd")];
/** The suburb's roofs: terracotta tiles and grey slates, as in any aerial photograph of one. */
export const SUBURB_ROOFS: readonly Rgb[] = [
  rgb("#b8664a"),
  rgb("#8e9298"),
  rgb("#a35540"),
  rgb("#5d646e"),
  rgb("#7b7672"),
];
const ROOF_SHAPES: readonly RoofShape[] = [hipRoof, gableRoof, hipRoof];
/** Each home's garage, plot by plot: on one side, none, on the other side, none, none. */
const GARAGE_PLANS: readonly (readonly number[])[] = [[0.054], [], [-0.054], [], []];
const STREET = rgb("#9a9b9c");

/**
 * The streets, each winding through the points it is given: a long S-bend from the north edge to
 * the south, a crescent looping off it to the east and back, and a cul-de-sac reaching west.
 */
const STREETS: readonly (readonly Spot[])[] = [
  [
    [-0.12, -0.47],
    [-0.28, -0.22],
    [-0.08, 0.02],
    [0.22, 0.14],
    [0.16, 0.47],
  ],
  [
    [-0.06, 0.0],
    [0.12, -0.21],
    [0.33, -0.23],
    [0.37, 0.0],
    [0.24, 0.13],
  ],
  [
    [-0.12, 0.06],
    [-0.24, 0.2],
    [-0.31, 0.32],
  ],
];
/** The cul-de-sac's turning circle, at its end. */
const TURNING_CIRCLE: { spot: Spot; radius: number } = { spot: [-0.31, 0.32], radius: 0.045 };
const STREET_WIDTH = 0.048;
/** How finely each stretch between a street's points is cut, to lie over the land. */
const STREET_STEPS = 4;
/** How far a home's middle stands back from its street's middle, and how far apart homes stand along it. */
const SETBACK = 0.092;
const FRONTAGE = 0.125;
/** No home stands nearer than this to any street's middle, nor nearer than this to another home. */
const STREET_CLEARANCE = 0.072;
const HOME_ROOM = 0.105;
/** Nothing stands further than this out from the square's middle, clear of its hedges and borders. */
const LOT_EDGE = 0.42;
/** Trees are scattered over a loose grid this far apart, kept this far clear of streets and homes. */
const GROVE_SPACING = 0.16;
const TREE_CLEARANCE = 0.065;
const MAX_TREES = 10;

/** A plot along a street: where its home stands, and how it is turned to face the street. */
interface Plot {
  readonly spot: Spot;
  readonly turn: number;
}

/**
 * A suburb: streets winding through it, a crescent and a cul-de-sac off them, lined both sides
 * with detached homes under hip and gable roofs, each turned to face its street with its drive
 * out to it and some with a garage; trees among the gardens, and cars on the drives and streets.
 */
export function housingDistrict(): District {
  const streets = STREETS.map((through) => curve({ through, steps: STREET_STEPS }));
  const homes = plotsAlong(streets).map(homeOn);
  return {
    decals: [
      ...streets.map((path) => road({ path, width: STREET_WIDTH, colour: STREET })),
      turningCircle(),
      ...homes.map((spec) => driveway({ home: spec, reach: SETBACK - STREET_WIDTH / 2 })),
    ],
    structures: [
      ...homes.map(home),
      ...grove({ streets, homes }).map((spot) => tree(spot, 0.05)),
      ...cars({ homes, streets }),
    ],
  };
}

function turningCircle(): Triangles {
  const { spot, radius } = TURNING_CIRCLE;
  return disc({ base: point(spot, DECAL_LIFT), radius, sides: 10, colour: STREET });
}

/**
 * The plots along every street, both sides, kept only where a home would stand clear of every
 * street and of the homes already placed; those nearest the middle placed first, the landmark first.
 */
function plotsAlong(streets: readonly Spot[][]): Plot[] {
  const clear = (plot: Plot) =>
    Math.max(Math.abs(plot.spot[0]), Math.abs(plot.spot[1])) <= LOT_EDGE &&
    streets.every((path) => path.every((at) => distance(at, plot.spot) >= STREET_CLEARANCE));
  return streets
    .flatMap(frontages)
    .filter(clear)
    .sort((a, b) => Math.hypot(...a.spot) - Math.hypot(...b.spot))
    .reduce<Plot[]>(
      (kept, plot) =>
        kept.every((other) => distance(other.spot, plot.spot) >= HOME_ROOM)
          ? [...kept, plot]
          : kept,
      [],
    );
}

/** Plots along both sides of a street, a frontage apart, each home turned to face the street. */
function frontages(path: readonly Spot[]): Plot[] {
  const lengths = path.slice(1).map((at, index) => distance(path[index], at));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const marks = Array.from(
    { length: Math.floor(total / FRONTAGE) },
    (_, index) => (index + 0.5) * FRONTAGE,
  );
  return marks.flatMap((mark) => {
    const { at, along } = pointAlong({ path, lengths, mark });
    const across: Spot = [-along[1], along[0]];
    return [-1, 1].map((side) => ({
      spot: [at[0] + across[0] * SETBACK * side, at[1] + across[1] * SETBACK * side] as Spot,
      turn: Math.atan2(side * across[0], -side * across[1]),
    }));
  });
}

/** The point a distance along a path, and the way the path runs there. */
function pointAlong(walk: { path: readonly Spot[]; lengths: readonly number[]; mark: number }): {
  at: Spot;
  along: Spot;
} {
  const { path, lengths } = walk;
  let left = walk.mark;
  let segment = 0;
  while (segment < lengths.length - 1 && left > lengths[segment]) left -= lengths[segment++];
  const [from, to] = [path[segment], path[segment + 1]];
  const share = Math.min(1, left / lengths[segment]);
  const along: Spot = [(to[0] - from[0]) / lengths[segment], (to[1] - from[1]) / lengths[segment]];
  return { at: [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share], along };
}

/** A home on its plot, its walls, roof and garage varied plot by plot. */
function homeOn(plot: Plot, index: number): HomeSpec {
  return {
    spot: plot.spot,
    turn: plot.turn,
    walls: WALLS[(index * 3) % WALLS.length],
    roof: SUBURB_ROOFS[(index * 2) % SUBURB_ROOFS.length],
    roofShape: ROOF_SHAPES[index % ROOF_SHAPES.length],
    garages: GARAGE_PLANS[index % GARAGE_PLANS.length],
  };
}

/** Trees scattered over the gardens, each clear of the streets and the homes. */
function grove(site: { streets: readonly Spot[][]; homes: readonly HomeSpec[] }): Spot[] {
  const across = Array.from({ length: 6 }, (_, step) => (step - 2.5) * GROVE_SPACING);
  const spots = across.flatMap((x, column) =>
    across.map((z, row): Spot => {
      const jitter = (salt: number) => (pseudoRandom(column * 7 + row * 13 + salt) - 0.5) * 0.08;
      return [x + jitter(1), z + jitter(2)];
    }),
  );
  const clear = (spot: Spot) =>
    site.streets.every((path) => path.every((at) => distance(at, spot) >= TREE_CLEARANCE)) &&
    site.homes.every((each) => distance(each.spot, spot) >= TREE_CLEARANCE) &&
    Math.max(Math.abs(spot[0]), Math.abs(spot[1])) <= LOT_EDGE + 0.02;
  return spots.filter(clear).slice(0, MAX_TREES);
}

/** Cars on some of the drives, and two out on the streets. */
function cars(site: { homes: readonly HomeSpec[]; streets: readonly Spot[][] }): Triangles[] {
  return [
    ...site.homes
      .filter((_, index) => index % 5 === 1)
      .map((spec, index) =>
        parkedCar({ home: spec, colour: CAR_COLOURS[index % CAR_COLOURS.length] }),
      ),
    carOnStreet({ path: site.streets[0], index: 6 }),
    carOnStreet({ path: site.streets[1], index: 9 }),
  ];
}

/** A car on a street at one of its points, heading along it. */
function carOnStreet(spot: { path: readonly Spot[]; index: number }): Triangles {
  const [at, next] = [spot.path[spot.index], spot.path[spot.index + 1]];
  const turn = Math.atan2(next[1] - at[1], next[0] - at[0]);
  return car({ spot: at, turn, colour: CAR_COLOURS[spot.index % CAR_COLOURS.length] });
}

function distance(a: Spot, b: Spot): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
