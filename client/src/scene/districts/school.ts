import type { KitStyle } from "../kit-style.js";
import { box, gableRoof, merge, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import {
  block,
  coach,
  extent,
  flag,
  ground,
  marking,
  point,
  tree,
  type BlockSpec,
  type Spot,
} from "./props.js";

const BRICK = rgb("#b35a3f");
const SLATE = rgb("#666b73");
const GYM_WALLS = rgb("#d6d0c2");
const GYM_ROOF = rgb("#7b8794");
const TRACK = rgb("#b65a4b");
const TURF = rgb("#5f9748");
const PAINT = rgb("#ecece6");
const PLAY_SURFACE = rgb("#d6b27c");
const ASPHALT = rgb("#55585e");
const BUS_YELLOW = rgb("#f2c230");
const PLAY_COLOURS = [rgb("#d8453b"), rgb("#3a78c2"), rgb("#f0c93a")];

const MAIN_HALL: BlockSpec = {
  spot: [-0.14, -0.26],
  size: [0.4, 0.11, 0.14],
  walls: BRICK,
  roof: SLATE,
  storeys: 2,
};
const CLASS_WING: BlockSpec = {
  spot: [-0.28, -0.04],
  size: [0.12, 0.09, 0.3],
  walls: BRICK,
  roof: SLATE,
  storeys: 2,
};
const SPORTS_FIELD: Spot = [0.16, 0.24];

const PLAY_THINGS: readonly Spot[] = [
  [-0.34, 0.27],
  [-0.27, 0.34],
  [-0.24, 0.26],
];

const TREES: readonly Spot[] = [
  [0.43, -0.42],
  [0.43, -0.02],
  [-0.44, 0.12],
  [-0.44, 0.44],
  [0.0, 0.42],
  [0.44, 0.44],
];

/**
 * A school's grounds: a brick hall and classroom wing with its flag, a gymnasium, a running track
 * round a playing field, a playground, and the yellow buses waiting in the bus loop.
 */
export function schoolDistrict(style: KitStyle): District {
  return {
    decals: [
      ground({ spot: SPORTS_FIELD, size: [0.42, 0.26], colour: TRACK }),
      marking({ spot: SPORTS_FIELD, size: [0.32, 0.16], colour: TURF }),
      ground({ spot: [-0.3, 0.3], size: [0.16, 0.14], colour: PLAY_SURFACE }),
      ground({ spot: [-0.07, 0.05], size: [0.2, 0.09], colour: ASPHALT }),
    ],
    structures: [
      schoolhouse(style),
      gymnasium(),
      ...buses(),
      ...playground(),
      box({ base: point(SPORTS_FIELD, 0), size: extent([0.004, 0.012, 0.16]), colour: PAINT }),
      ...TREES.map((spot) => tree(spot, 0.05)),
    ],
  };
}

/** The brick hall and classroom wing, with the side's flag out front: the landmark. */
function schoolhouse(style: KitStyle): Triangles {
  return merge([
    block(MAIN_HALL),
    block(CLASS_WING),
    flag({ spot: [0.1, -0.14], height: 0.2, colour: style.accent }),
  ]);
}

function buses(): Triangles[] {
  return [-0.12, -0.07, -0.02].map((x) =>
    coach({ spot: [x, 0.05], turn: Math.PI / 2, colour: BUS_YELLOW }),
  );
}

function playground(): Triangles[] {
  return PLAY_THINGS.map((spot, index) =>
    box({ base: point(spot, 0), size: extent([0.03, 0.03, 0.02]), colour: PLAY_COLOURS[index] }),
  );
}

function gymnasium(): Triangles {
  return merge([
    block({
      spot: [0.26, -0.26],
      size: [0.2, 0.09, 0.16],
      walls: GYM_WALLS,
      roof: GYM_ROOF,
      storeys: 0,
    }),
    gableRoof({
      base: point([0.26, -0.26], 0.09),
      size: extent([0.21, 0.03, 0.17]),
      colour: GYM_ROOF,
    }),
  ]);
}
