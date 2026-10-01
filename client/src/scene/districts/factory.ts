import type { KitStyle } from "../kit-style.js";
import { cylinder } from "../round-shapes.js";
import { box, gableRoof, merge, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { block, coach, extent, ground, point, type Spot } from "./props.js";

const SHED_WALLS = rgb("#8e949c");
const SHED_ROOF = rgb("#6d737c");
const STACK_RED = rgb("#b04a3a");
const STACK_BAND = rgb("#ecebe6");
const TANK = rgb("#d9dde1");
const WAREHOUSE_WALLS = rgb("#a39a88");
const WAREHOUSE_ROOF = rgb("#7d858f");
const OFFICE_WALLS = rgb("#c9c2b3");
const YARD = rgb("#4f5257");
const TRAILER = rgb("#e4e2dc");

const SHED: Spot = [-0.12, -0.18];
const SHED_SIZE = [0.42, 0.1, 0.26] as const;
const STACKS: readonly Spot[] = [
  [0.2, -0.34],
  [0.28, -0.34],
  [0.36, -0.34],
];
const TANKS: readonly Spot[] = [
  [0.32, 0.0],
  [0.32, 0.15],
  [0.18, 0.08],
];
const TRUCKS: readonly Spot[] = [
  [-0.04, 0.06],
  [-0.04, 0.12],
  [0.06, 0.12],
];

/**
 * A factory's works: a great shed under a sawtooth roof, three smokestacks, storage tanks, a
 * warehouse, the offices, and lorries at the loading yard, all on concrete.
 */
export function factoryDistrict(style: KitStyle): District {
  return {
    decals: [ground({ spot: [0.0, 0.1], size: [0.24, 0.14], colour: YARD })],
    structures: [
      shed(style),
      ...STACKS.map(smokestack),
      ...TANKS.map((spot) =>
        cylinder({ base: point(spot, 0), radius: 0.05, height: 0.08, sides: 8, colour: TANK }),
      ),
      warehouse(),
      block({
        spot: [0.14, 0.36],
        size: [0.14, 0.08, 0.08],
        walls: OFFICE_WALLS,
        roof: SHED_ROOF,
        storeys: 2,
      }),
      ...TRUCKS.map((spot) => coach({ spot, turn: 0, colour: TRAILER })),
    ],
  };
}

/** The main shed: its sawtooth roof four ridges deep, and a stripe of the side's colour along it. */
function shed(style: KitStyle): Triangles {
  const [width, height, depth] = SHED_SIZE;
  const ridges = [-1.5, -0.5, 0.5, 1.5].map((step) =>
    gableRoof({
      base: point([SHED[0], SHED[1] + (step * depth) / 4], height),
      size: extent([width, 0.035, depth / 4]),
      colour: SHED_ROOF,
    }),
  );
  return merge([
    box({ base: point(SHED, 0), size: extent(SHED_SIZE), colour: SHED_WALLS }),
    box({
      base: point([SHED[0], SHED[1] + depth / 2], height - 0.02),
      size: extent([width, 0.012, 0.004]),
      colour: style.accent,
    }),
    ...ridges,
  ]);
}

function smokestack(spot: Spot): Triangles {
  return merge([
    cylinder({ base: point(spot, 0), radius: 0.02, height: 0.32, sides: 6, colour: STACK_RED }),
    cylinder({
      base: point(spot, 0.24),
      radius: 0.021,
      height: 0.03,
      sides: 6,
      colour: STACK_BAND,
    }),
  ]);
}

function warehouse(): Triangles {
  return merge([
    block({
      spot: [-0.26, 0.26],
      size: [0.3, 0.07, 0.14],
      walls: WAREHOUSE_WALLS,
      roof: WAREHOUSE_ROOF,
      storeys: 0,
    }),
    gableRoof({
      base: point([-0.26, 0.26], 0.07),
      size: extent([0.31, 0.03, 0.15]),
      colour: WAREHOUSE_ROOF,
    }),
  ]);
}
