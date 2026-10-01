import type { KitStyle } from "../kit-style.js";
import { box, merge, placed, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { block, extent, flag, ground, helipad, point, type Size, type Spot } from "./props.js";

const OLIVE = rgb("#6f7552");
const OLIVE_ROOF = rgb("#565b41");
const STONE = rgb("#8b8672");
const STONE_DARK = rgb("#6e6a58");
const TANK_GREEN = rgb("#556b2f");
const PARADE = rgb("#b9a987");

/** The perimeter wall, with the gate in its south side. */
const WALLS: readonly { spot: Spot; size: Size }[] = [
  { spot: [0, -0.42], size: [0.84, 0.045, 0.022] },
  { spot: [0.42, 0], size: [0.022, 0.045, 0.84] },
  { spot: [-0.42, 0], size: [0.022, 0.045, 0.84] },
  { spot: [-0.26, 0.42], size: [0.32, 0.045, 0.022] },
  { spot: [0.26, 0.42], size: [0.32, 0.045, 0.022] },
];
const CORNERS: readonly Spot[] = [
  [-0.42, -0.42],
  [0.42, -0.42],
  [-0.42, 0.42],
  [0.42, 0.42],
];
const BARRACKS: readonly Spot[] = [
  [-0.22, -0.28],
  [0.22, -0.28],
  [-0.24, 0.24],
];
const TANKS: readonly Spot[] = [
  [0.14, 0.24],
  [0.24, 0.24],
  [0.34, 0.24],
];

/**
 * A fort as a garrison: a walled compound with a watchtower roofed in the side's colour at each
 * corner, headquarters flying its flag, barracks, a parade ground, a helipad and a row of tanks.
 */
export function fortDistrict(style: KitStyle): District {
  return {
    decals: [
      ground({ spot: [0.02, 0.14], size: [0.22, 0.14], colour: PARADE }),
      helipad({ spot: [-0.26, 0.0], y: 0.004, ring: style.accent }),
    ],
    structures: [
      headquarters(style),
      ...defences(style),
      ...BARRACKS.map(barracks),
      ...TANKS.map(tank),
    ],
  };
}

function headquarters(style: KitStyle): Triangles {
  return merge([
    block({
      spot: [0, -0.04],
      size: [0.16, 0.1, 0.12],
      walls: OLIVE,
      roof: OLIVE_ROOF,
      storeys: 1,
    }),
    flag({ spot: [0.1, -0.12], height: 0.22, colour: style.accent }),
  ]);
}

/** The perimeter wall and a watchtower at each corner, roofed in the side's colour. */
function defences(style: KitStyle): Triangles[] {
  return [
    ...WALLS.map(({ spot, size }) =>
      box({ base: point(spot, 0), size: extent(size), colour: STONE }),
    ),
    ...CORNERS.map((spot) =>
      block({ spot, size: [0.06, 0.1, 0.06], walls: STONE_DARK, roof: style.accent, storeys: 0 }),
    ),
  ];
}

function barracks(spot: Spot): Triangles {
  return block({ spot, size: [0.24, 0.05, 0.08], walls: OLIVE, roof: OLIVE_ROOF, storeys: 1 });
}

function tank(spot: Spot): Triangles {
  const vehicle = merge([
    box({ base: point([0, 0], 0), size: extent([0.06, 0.018, 0.036]), colour: TANK_GREEN }),
    box({
      base: point([-0.004, 0], 0.018),
      size: extent([0.028, 0.013, 0.024]),
      colour: TANK_GREEN,
    }),
    box({ base: point([0.028, 0], 0.022), size: extent([0.04, 0.005, 0.005]), colour: OLIVE_ROOF }),
  ]);
  return placed(vehicle, { offset: point(spot, 0), turn: -Math.PI / 2 });
}
