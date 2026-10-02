import {
  merge,
  placed,
  rgb,
  sheet,
  walls,
  type BoxSpec,
  type Rgb,
  type Triangles,
} from "../shapes.js";
import { DECAL_LIFT, car, extent, point, type Spot } from "./props.js";

/** How a home is roofed: a gable roof or a hip roof, its ridge running along the home's front. */
export type RoofShape = (spec: BoxSpec) => Triangles;

export interface HomeSpec {
  readonly spot: Spot;
  /** Radians about the vertical. Unturned, a home's front faces south; it is turned to face its street. */
  readonly turn: number;
  readonly walls: Rgb;
  readonly roof: Rgb;
  readonly roofShape: RoofShape;
  /** Where its garage stands along its front, from its middle: none, or one to a side. */
  readonly garages: readonly number[];
}

/** A detached home's walls along its front, their height, and how deep it is from front to back. */
const BODY = [0.08, 0.03, 0.058] as const;
const EAVES = 0.008;
const ROOF_RISE = 0.026;
const GARAGE = [0.034, 0.022, 0.046] as const;
/** How far a garage stands forward of the home's front, toward the street. */
const GARAGE_FORWARD = 0.01;
const DRIVE_WIDTH = 0.03;
const DRIVE = rgb("#b9b7b0");

/** A detached home: walls, its roof overhanging them a little, and its garage if it has one. */
export function home(spec: HomeSpec): Triangles {
  const [width, height, depth] = BODY;
  const parts = [
    walls({ base: point([0, 0], 0), size: extent(BODY), colour: spec.walls }),
    spec.roofShape({
      base: point([0, 0], height),
      size: extent([width + EAVES, ROOF_RISE, depth + EAVES]),
      colour: spec.roof,
    }),
    ...spec.garages.map((along) => garage({ along, home: spec })),
  ];
  return placed(merge(parts), { offset: point(spec.spot, 0), turn: spec.turn });
}

function garage(at: { along: number; home: HomeSpec }): Triangles {
  const [width, height, depth] = GARAGE;
  const spot: Spot = [at.along, GARAGE_FORWARD];
  return merge([
    walls({ base: point(spot, 0), size: extent(GARAGE), colour: at.home.walls }),
    at.home.roofShape({
      base: point(spot, height),
      size: extent([width + EAVES, ROOF_RISE * 0.6, depth + EAVES]),
      colour: at.home.roof,
    }),
  ]);
}

export interface DriveSpec {
  readonly home: HomeSpec;
  /** How far the street's edge lies in front of the home's middle. */
  readonly reach: number;
}

/** The paved drive from a home's garage, or its front door, out to its street. */
export function driveway(spec: DriveSpec): Triangles {
  const along = spec.home.garages[0] ?? 0;
  const start = BODY[2] / 2;
  const length = spec.reach - start;
  const drive = sheet({
    width: DRIVE_WIDTH,
    depth: length,
    cuts: 1,
    top: DECAL_LIFT,
    colour: DRIVE,
  });
  return placeOnLot({ part: drive, local: [along, start + length / 2], home: spec.home });
}

/** A car parked on a home's drive, nose to the garage. */
export function parkedCar(spec: { home: HomeSpec; colour: Rgb }): Triangles {
  const along = spec.home.garages[0] ?? 0;
  const parked = car({ spot: [0, 0], turn: Math.PI / 2, colour: spec.colour });
  return placeOnLot({ part: parked, local: [along, BODY[2] / 2 + 0.028], home: spec.home });
}

function placeOnLot(lot: { part: Triangles; local: Spot; home: HomeSpec }): Triangles {
  const moved = placed(lot.part, { offset: point(lot.local, 0), turn: 0 });
  return placed(moved, { offset: point(lot.home.spot, 0), turn: lot.home.turn });
}
