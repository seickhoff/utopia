import { arc, fence } from "../path-shapes.js";
import { cone, cylinder } from "../round-shapes.js";
import {
  box,
  gableRoof,
  merge,
  placed,
  pyramid,
  rgb,
  type Rgb,
  type Triangles,
} from "../shapes.js";
import type { District } from "./district.js";
import { extent, ground, point, puff, tree, type Spot } from "./props.js";

const CANVAS = rgb("#a89a6c");
const CAMOUFLAGE = [rgb("#5b6340"), rgb("#6b6b47"), rgb("#7a6e4f")];
const BELL_CANVAS = rgb("#c2b58c");
const REBEL_RED = rgb("#b3261e");
const TRAMPLED = rgb("#8d7755");
const STONES = rgb("#6d6a64");
const FLAME = rgb("#f28c28");
const EMBER = rgb("#ffd34d");
const WOODSMOKE = rgb("#a7a39a");
const LOGS = rgb("#6b4a2b");
const CRATE = rgb("#7a5a36");
const PICKUP = rgb("#8a7a52");
const PICKUP_GLASS = rgb("#2b2f2a");
const GUN = rgb("#3a3a36");

/** Ridge tents pitched wherever there was room, each its own way round. */
const RIDGE_TENTS: readonly { spot: Spot; turn: number }[] = [
  { spot: [-0.25, -0.22], turn: 0.5 },
  { spot: [-0.07, -0.3], turn: -0.3 },
  { spot: [0.24, -0.27], turn: 0.9 },
  { spot: [0.3, 0.05], turn: 1.4 },
  { spot: [-0.3, 0.08], turn: 1.2 },
  { spot: [0.24, 0.28], turn: -0.6 },
];
const BELL_TENTS: readonly Spot[] = [
  [-0.17, 0.28],
  [0.08, 0.34],
  [-0.36, -0.07],
];
const CRATES: readonly Spot[] = [
  [-0.03, 0.26],
  [0.0, 0.285],
  [-0.035, 0.295],
];
const TREES: readonly Spot[] = [
  [-0.42, -0.41],
  [-0.15, -0.44],
  [0.12, -0.43],
  [0.43, -0.37],
  [0.44, -0.12],
  [0.43, 0.42],
  [-0.43, 0.31],
  [-0.06, 0.44],
  [0.44, 0.22],
  [-0.44, -0.2],
];
const FIRE: Spot = [0.03, 0.11];

/**
 * A rebel camp in the woods: a canvas command tent under the red flag, ridge and bell tents
 * pitched among the trees, a campfire smoking in the middle, a log stockade, a lookout of rough
 * timber, and a pickup with a gun on its back, all on trampled earth.
 */
export function rebelCamp(): District {
  return {
    decals: [
      ground({ spot: [0, 0.06], size: [0.36, 0.28], colour: TRAMPLED }),
      ground({ spot: [-0.2, -0.22], size: [0.22, 0.14], colour: TRAMPLED }),
    ],
    structures: [commandTent(), ...tents(), ...camp(), ...TREES.map((spot) => tree(spot, 0.06))],
  };
}

/** The ridge tents in camouflage and the canvas bell tents. */
function tents(): Triangles[] {
  return [
    ...RIDGE_TENTS.map((tent, index) => ridgeTent({ ...tent, colour: CAMOUFLAGE[index % 3] })),
    ...BELL_TENTS.map((spot) =>
      cone({ base: point(spot, 0), radius: 0.04, height: 0.06, sides: 7, colour: BELL_CANVAS }),
    ),
  ];
}

/** The campfire, the stockade, the lookout, the pickup and the crates of stores. */
function camp(): Triangles[] {
  return [
    campfire(FIRE),
    ...stockade(),
    lookout([0.37, -0.2]),
    technical({ spot: [-0.16, 0.15], turn: 0.5 }),
    ...CRATES.map((spot) =>
      box({ base: point(spot, 0), size: extent([0.026, 0.022, 0.026]), colour: CRATE }),
    ),
  ];
}

/** The command tent, the biggest under canvas, and the rebels' red flag on a pole beside it. */
function commandTent(): Triangles {
  const tent = gableRoof({
    base: point([0, 0], 0),
    size: extent([0.16, 0.075, 0.11]),
    colour: CANVAS,
  });
  return merge([
    placed(tent, { offset: point([0, -0.07], 0), turn: 0.2 }),
    box({ base: point([0.11, -0.13], 0), size: extent([0.005, 0.15, 0.005]), colour: LOGS }),
    box({
      base: point([0.132, -0.13], 0.12),
      size: extent([0.04, 0.026, 0.003]),
      colour: REBEL_RED,
    }),
  ]);
}

function ridgeTent(spec: { spot: Spot; turn: number; colour: Rgb }): Triangles {
  const tent = gableRoof({
    base: point([0, 0], 0),
    size: extent([0.08, 0.045, 0.06]),
    colour: spec.colour,
  });
  return placed(tent, { offset: point(spec.spot, 0), turn: spec.turn });
}

/** A ring of stones, the fire in it, and a drift of smoke over it. */
function campfire(spot: Spot): Triangles {
  const [x, z] = spot;
  return merge([
    cylinder({ base: point(spot, 0), radius: 0.03, height: 0.008, sides: 6, colour: STONES }),
    pyramid({ base: point(spot, 0.008), size: extent([0.024, 0.04, 0.024]), colour: FLAME }),
    pyramid({ base: point(spot, 0.008), size: extent([0.012, 0.028, 0.012]), colour: EMBER }),
    puff({ spot: [x + 0.01, z], y: 0.06, radius: 0.018, colour: WOODSMOKE }),
    puff({ spot: [x + 0.03, z], y: 0.09, radius: 0.026, colour: WOODSMOKE }),
  ]);
}

/** Stretches of log stockade round the camp, with gaps where the trees and the tracks come in. */
function stockade(): Triangles[] {
  const stretches: readonly [number, number][] = [
    [-2.5, -1.75],
    [1.95, 2.85],
  ];
  return stretches.map(([from, to]) =>
    fence({
      path: arc({ centre: [0, 0], radius: 0.42, from, to, steps: 5 }),
      height: 0.026,
      colour: LOGS,
    }),
  );
}

/** A lookout of rough timber: its legs, its platform and its roof. */
function lookout(spot: Spot): Triangles {
  return merge([
    box({ base: point(spot, 0), size: extent([0.02, 0.1, 0.02]), colour: LOGS }),
    box({ base: point(spot, 0.1), size: extent([0.04, 0.012, 0.04]), colour: LOGS }),
    pyramid({ base: point(spot, 0.112), size: extent([0.05, 0.03, 0.05]), colour: CANVAS }),
  ]);
}

/** A pickup with a machine gun on the back. */
function technical(spec: { spot: Spot; turn: number }): Triangles {
  const pickup = merge([
    box({ base: point([0, 0], 0), size: extent([0.05, 0.012, 0.022]), colour: PICKUP }),
    box({ base: point([0.01, 0], 0.012), size: extent([0.018, 0.01, 0.02]), colour: PICKUP_GLASS }),
    box({ base: point([-0.012, 0], 0.012), size: extent([0.026, 0.004, 0.004]), colour: GUN }),
  ]);
  return placed(pickup, { offset: point(spec.spot, 0), turn: spec.turn });
}
