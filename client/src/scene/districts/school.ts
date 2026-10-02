import type { KitStyle } from "../kit-style.js";
import { vaultRoof } from "../roof-shapes.js";
import { box, merge, rgb, walls, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import {
  block,
  coach,
  extent,
  flag,
  ground,
  point,
  tree,
  type BlockSpec,
  type Spot,
} from "./props.js";
import { ballpark, runningTrack } from "./sports.js";

const BRICK = rgb("#b35a3f");
const SLATE = rgb("#666b73");
const GYM_WALLS = rgb("#d6d0c2");
const GYM_ROOF = rgb("#8a96a3");
const PLAY_SURFACE = rgb("#d6b27c");
const ASPHALT = rgb("#55585e");
const BUS_YELLOW = rgb("#f2c230");
const PLAY_COLOURS = [rgb("#d8453b"), rgb("#3a78c2"), rgb("#f0c93a")];

const MAIN_HALL: BlockSpec = {
  spot: [-0.12, -0.34],
  size: [0.42, 0.1, 0.12],
  walls: BRICK,
  roof: SLATE,
  storeys: 2,
};
const CLASS_WING: BlockSpec = {
  spot: [-0.27, -0.18],
  size: [0.11, 0.08, 0.2],
  walls: BRICK,
  roof: SLATE,
  storeys: 2,
};
const GYM: Spot = [0.29, -0.31];
const GYM_SIZE = [0.2, 0.05, 0.15] as const;
const BUS_LOOP: Spot = [0.04, -0.18];
const BUSES: readonly Spot[] = [
  [-0.01, -0.2],
  [-0.01, -0.165],
  [0.085, -0.2],
];
const PLAYGROUND: Spot = [-0.4, -0.15];
const PLAY_THINGS: readonly Spot[] = [
  [-0.42, -0.19],
  [-0.38, -0.13],
  [-0.415, -0.1],
];
const TREES: readonly Spot[] = [
  [0.43, -0.1],
  [0.31, -0.13],
  [-0.1, -0.03],
  [0.05, -0.01],
  [-0.44, 0.02],
  [-0.44, 0.42],
  [0.0, 0.43],
];

/**
 * A school's grounds: a brick hall and classroom wing with the side's flag out front, a vaulted
 * gymnasium, the yellow buses in the bus loop, a playground, a running track round a football
 * pitch, and a baseball diamond.
 */
export function schoolDistrict(style: KitStyle): District {
  const diamond = ballpark([0.12, 0.36]);
  return {
    decals: [
      ...runningTrack({ centre: [-0.19, 0.2], reach: 0.07, radius: 0.085 }),
      ...diamond.decals,
      ground({ spot: PLAYGROUND, size: [0.09, 0.13], colour: PLAY_SURFACE }),
      ground({ spot: BUS_LOOP, size: [0.24, 0.1], colour: ASPHALT }),
    ],
    structures: [
      schoolhouse(style),
      gymnasium(),
      ...BUSES.map((spot) => coach({ spot, turn: 0, colour: BUS_YELLOW })),
      ...playground(),
      ...diamond.structures,
      ...TREES.map((spot) => tree(spot, 0.05)),
    ],
  };
}

/** The brick hall and classroom wing, with the side's flag out front: the landmark. */
function schoolhouse(style: KitStyle): Triangles {
  return merge([
    block(MAIN_HALL),
    block(CLASS_WING),
    flag({ spot: [0.13, -0.24], height: 0.2, colour: style.accent }),
  ]);
}

function playground(): Triangles[] {
  return PLAY_THINGS.map((spot, index) =>
    box({ base: point(spot, 0), size: extent([0.03, 0.03, 0.02]), colour: PLAY_COLOURS[index] }),
  );
}

/** The gymnasium under its vaulted roof. */
function gymnasium(): Triangles {
  const [width, height, depth] = GYM_SIZE;
  return merge([
    walls({ base: point(GYM, 0), size: extent(GYM_SIZE), colour: GYM_WALLS }),
    vaultRoof({
      base: point(GYM, height),
      size: extent([width + 0.006, 0.05, depth + 0.006]),
      colour: GYM_ROOF,
      segments: 4,
    }),
  ]);
}
