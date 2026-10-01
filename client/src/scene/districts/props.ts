import { cylinder, disc } from "../round-shapes.js";
import {
  box,
  gableRoof,
  merge,
  patch,
  placed,
  rgb,
  sheet,
  type Rgb,
  type Triangles,
  type Vec3,
} from "../shapes.js";

/** A place on a square's floor: x to the east and z to the south, each -0.5 to 0.5. */
export type Spot = readonly [number, number];
/** Width (west to east), height and depth (north to south). */
export type Size = readonly [number, number, number];

const GLASS = rgb("#4a6784");
const LEAVES = [rgb("#3b7437"), rgb("#4c8a42"), rgb("#33642f")];
const ASPHALT = rgb("#55585e");
const PAINT = rgb("#e6e6e0");
const CAR_GLASS = rgb("#27313b");
const PAD_GREY = rgb("#4d5157");
const POLE = rgb("#8a8d91");
/** Decals lie this far above the ground, and their markings a little higher still. */
export const DECAL_LIFT = 0.006;
const MARKING_LIFT = 0.009;

export const CAR_COLOURS: readonly Rgb[] = [
  rgb("#b83a30"),
  rgb("#2c3e50"),
  rgb("#e9ecee"),
  rgb("#8f979c"),
  rgb("#2d74a8"),
  rgb("#d9b43a"),
];

export const point = (spot: Spot, y: number): Vec3 => ({ x: spot[0], y, z: spot[1] });
export const extent = ([x, y, z]: Size): Vec3 => ({ x, y, z });

export interface BlockSpec {
  readonly spot: Spot;
  readonly size: Size;
  readonly walls: Rgb;
  readonly roof: Rgb;
  /** Rows of windows round the walls; 0 for none. */
  readonly storeys: number;
}

/** A flat-roofed building with a row of windows round it for each storey. */
export function block(spec: BlockSpec): Triangles {
  const [width, height, depth] = spec.size;
  const windows = Array.from({ length: spec.storeys }, (_, storey) =>
    box({
      base: point(spec.spot, ((storey + 0.45) / spec.storeys) * height * 0.9),
      size: extent([width + 0.004, Math.min(0.012, height / (spec.storeys * 2.5)), depth + 0.004]),
      colour: GLASS,
    }),
  );
  return merge([
    box({ base: point(spec.spot, 0), size: extent(spec.size), colour: spec.walls }),
    box({
      base: point(spec.spot, height),
      size: extent([width - 0.012, 0.005, depth - 0.012]),
      colour: spec.roof,
    }),
    ...windows,
  ]);
}

export interface HouseSpec {
  readonly spot: Spot;
  /** Radians about the vertical, so a street of houses is not all one way round. */
  readonly turn: number;
  readonly walls: Rgb;
  readonly roof: Rgb;
}

/** A small house with a pitched roof. */
export function house(spec: HouseSpec): Triangles {
  const home = merge([
    box({ base: point([0, 0], 0), size: extent([0.07, 0.034, 0.052]), colour: spec.walls }),
    gableRoof({
      base: point([0, 0], 0.034),
      size: extent([0.076, 0.028, 0.06]),
      colour: spec.roof,
    }),
  ]);
  return placed(home, { offset: point(spec.spot, 0), turn: spec.turn });
}

/** A tree's crown, round from above, in one of a few greens. */
export function tree(spot: Spot, height: number): Triangles {
  const shade = LEAVES[Math.floor(Math.abs(spot[0] * 37 + spot[1] * 91)) % LEAVES.length];
  return cylinder({ base: point(spot, 0), radius: height * 0.45, height, sides: 6, colour: shade });
}

export interface VehicleSpec {
  readonly spot: Spot;
  readonly turn: number;
  readonly colour: Rgb;
}

/** A car: a body and a glass cabin. */
export function car(spec: VehicleSpec): Triangles {
  const body = merge([
    box({ base: point([0, 0], 0), size: extent([0.044, 0.013, 0.021]), colour: spec.colour }),
    box({ base: point([-0.004, 0], 0.013), size: extent([0.022, 0.01, 0.018]), colour: CAR_GLASS }),
  ]);
  return placed(body, { offset: point(spec.spot, 0), turn: spec.turn });
}

/** A bus or a lorry: a long body with a band of windows or a cab in front. */
export function coach(spec: VehicleSpec): Triangles {
  const body = merge([
    box({ base: point([0, 0], 0), size: extent([0.078, 0.026, 0.024]), colour: spec.colour }),
    box({ base: point([0, 0], 0.014), size: extent([0.08, 0.007, 0.026]), colour: CAR_GLASS }),
  ]);
  return placed(body, { offset: point(spec.spot, 0), turn: spec.turn });
}

export interface GroundSpec {
  readonly spot: Spot;
  /** Width and depth. */
  readonly size: readonly [number, number];
  readonly colour: Rgb;
}

/** A rectangle of paving, court or turf laid over the ground. */
export function ground(spec: GroundSpec): Triangles {
  return groundAt({ ...spec, lift: DECAL_LIFT });
}

/** Paint on paving: a line, a lane marking. */
export function marking(spec: GroundSpec): Triangles {
  const [width, depth] = spec.size;
  const cuts = Math.max(1, Math.ceil(Math.max(width, depth) / 0.1));
  const paint = sheet({ width, depth, cuts, top: MARKING_LIFT, colour: spec.colour });
  return placed(paint, { offset: point(spec.spot, 0), turn: 0 });
}

function groundAt(spec: GroundSpec & { lift: number }): Triangles {
  const [width, depth] = spec.size;
  const cuts = Math.max(1, Math.ceil(Math.max(width, depth) / 0.1));
  const cover = patch({ width, depth, cuts, top: spec.lift, skirt: 0.004, colour: spec.colour });
  return placed(cover, { offset: point(spec.spot, 0), turn: 0 });
}

/** A lane of asphalt from one spot to another. */
export function lane(stretch: { from: Spot; to: Spot }): Triangles {
  const [dx, dz] = [stretch.to[0] - stretch.from[0], stretch.to[1] - stretch.from[1]];
  const length = Math.hypot(dx, dz);
  const cuts = Math.max(1, Math.ceil(length / 0.1));
  const strip = patch({
    width: length,
    depth: 0.05,
    cuts,
    top: DECAL_LIFT,
    skirt: 0.004,
    colour: ASPHALT,
  });
  const middle: Spot = [
    (stretch.from[0] + stretch.to[0]) / 2,
    (stretch.from[1] + stretch.to[1]) / 2,
  ];
  return placed(strip, { offset: point(middle, 0), turn: Math.atan2(dz, dx) });
}

/** A car park: asphalt with a row of painted bays along its north and south sides. */
export function carPark(spec: { spot: Spot; size: readonly [number, number] }): Triangles {
  const [width, depth] = spec.size;
  const bays = Math.floor(width / 0.066);
  const lines = [-1, 1].flatMap((side) =>
    Array.from({ length: bays + 1 }, (_, bay) =>
      marking({
        spot: [spec.spot[0] + (bay / bays - 0.5) * width * 0.9, spec.spot[1] + side * depth * 0.28],
        size: [0.004, depth * 0.36],
        colour: PAINT,
      }),
    ),
  );
  return merge([ground({ spot: spec.spot, size: spec.size, colour: ASPHALT }), ...lines]);
}

/** A helipad: a dark disc ringed in the side's colour, with its white H, at a given height. */
export function helipad(spec: { spot: Spot; y: number; ring: Rgb }): Triangles {
  const at = ([x, z]: Spot, lift: number) =>
    point([spec.spot[0] + x, spec.spot[1] + z], spec.y + lift);
  return merge([
    disc({ base: at([0, 0], 0.001), radius: 0.062, sides: 12, colour: spec.ring }),
    disc({ base: at([0, 0], 0.002), radius: 0.054, sides: 12, colour: PAD_GREY }),
    box({ base: at([-0.016, 0], 0.002), size: extent([0.007, 0.002, 0.044]), colour: PAINT }),
    box({ base: at([0.016, 0], 0.002), size: extent([0.007, 0.002, 0.044]), colour: PAINT }),
    box({ base: at([0, 0], 0.002), size: extent([0.03, 0.002, 0.007]), colour: PAINT }),
  ]);
}

/** A flagpole with its flag flying east. */
export function flag(spec: { spot: Spot; height: number; colour: Rgb }): Triangles {
  const top = spec.height;
  return merge([
    box({ base: point(spec.spot, 0), size: extent([0.005, top, 0.005]), colour: POLE }),
    box({
      base: point([spec.spot[0] + 0.022, spec.spot[1]], top - 0.03),
      size: extent([0.04, 0.026, 0.003]),
      colour: spec.colour,
    }),
  ]);
}
