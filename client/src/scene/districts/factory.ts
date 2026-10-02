import type { KitStyle } from "../kit-style.js";
import { cylinder } from "../round-shapes.js";
import { box, merge, pyramid, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { block, coach, extent, ground, point, puff, type BlockSpec, type Spot } from "./props.js";

const HALL_WALLS = rgb("#e8e2d4");
const HALL_ROOF = rgb("#cdc7ba");
const STEEL = rgb("#b9bec4");
const SOOT = rgb("#5e6266");
const SMOKE = rgb("#f4f4f2");
const TANK_WHITE = rgb("#eef0f0");
const COLUMN = rgb("#c4c8cc");
const PLANT_FRAME = rgb("#8c9196");
const PIPES = rgb("#9aa0a6");
const PYLON = rgb("#7f858b");
const BUND = rgb("#6a6c6e");
const YARD = rgb("#4f5257");
const TANKER = rgb("#e4e2dc");
const OFFICE_WALLS = rgb("#c9c2b3");

/** A puff of a plume: how far it has drifted east and risen from the stack's top, and its size. */
interface Puff {
  readonly drift: number;
  readonly rise: number;
  readonly radius: number;
}
/** A plume of smoke as it leaves a stack: puffs rising, swelling and drifting away east. */
const PLUME: readonly Puff[] = [
  { drift: 0.0, rise: 0.0, radius: 0.022 },
  { drift: 0.025, rise: 0.035, radius: 0.03 },
  { drift: 0.06, rise: 0.065, radius: 0.04 },
  { drift: 0.1, rise: 0.09, radius: 0.048 },
];
/** The stacks in a row beside the boiler house, each with its plume of smoke, or none. */
const STACKS: readonly { x: number; plume: readonly Puff[] }[] = [
  { x: 0.1, plume: PLUME },
  { x: 0.155, plume: [] },
  { x: 0.21, plume: PLUME },
  { x: 0.265, plume: PLUME },
];
const STACK_Z = -0.31;
const STACK_HEIGHT = 0.36;
const TURBINE_HALL: BlockSpec = {
  spot: [-0.22, -0.3],
  size: [0.32, 0.085, 0.14],
  walls: HALL_WALLS,
  roof: HALL_ROOF,
  storeys: 0,
};
const BOILER_HOUSE: BlockSpec = {
  spot: [0, -0.31],
  size: [0.12, 0.14, 0.12],
  walls: HALL_WALLS,
  roof: HALL_ROOF,
  storeys: 0,
};
const OFFICE: BlockSpec = {
  spot: [0.38, 0.36],
  size: [0.12, 0.06, 0.09],
  walls: OFFICE_WALLS,
  roof: HALL_ROOF,
  storeys: 2,
};
const TANK_ROWS = [0.05, 0.18];
const TANK_COLUMNS = [-0.36, -0.24, -0.12];
const COLUMNS: readonly { spot: Spot; height: number }[] = [
  { spot: [0.18, 0.09], height: 0.16 },
  { spot: [0.22, 0.15], height: 0.22 },
  { spot: [0.27, 0.08], height: 0.13 },
  { spot: [0.31, 0.14], height: 0.19 },
  { spot: [0.35, 0.09], height: 0.15 },
];
const TANKERS: readonly Spot[] = [
  [-0.3, 0.35],
  [-0.18, 0.37],
];

/**
 * A factory as an industrial plant seen from the air: the power station's cream halls with a row
 * of tall silver stacks trailing white smoke, a tank farm of squat white tanks, the plant's
 * columns and pipe racks, a pylon carrying the power away, and tankers at the loading bay.
 */
export function factoryDistrict(style: KitStyle): District {
  return {
    decals: [
      ground({ spot: [-0.24, 0.115], size: [0.38, 0.27], colour: BUND }),
      ground({ spot: [-0.22, 0.36], size: [0.34, 0.1], colour: YARD }),
    ],
    structures: [
      powerStation(style),
      ...STACKS.map(smokestack),
      ...TANK_ROWS.flatMap((z) => TANK_COLUMNS.map((x) => storageTank([x, z]))),
      processPlant(),
      ...pipeRacks(),
      pylon([0.42, -0.12]),
      ...TANKERS.map((spot) => coach({ spot, turn: 0, colour: TANKER })),
      block(OFFICE),
    ],
  };
}

/** The turbine hall and the taller boiler house, a stripe of the side's colour along them: the landmark. */
function powerStation(style: KitStyle): Triangles {
  return merge([
    block(TURBINE_HALL),
    block(BOILER_HOUSE),
    box({
      base: point([TURBINE_HALL.spot[0], -0.229], 0.06),
      size: extent([TURBINE_HALL.size[0], 0.012, 0.004]),
      colour: style.accent,
    }),
  ]);
}

/** A tall silver stack, sooted at its top, and the smoke it is giving off. */
function smokestack(stack: { x: number; plume: readonly Puff[] }): Triangles {
  const spot: Spot = [stack.x, STACK_Z];
  return merge([
    cylinder({
      base: point(spot, 0),
      radius: 0.018,
      height: STACK_HEIGHT,
      sides: 6,
      colour: STEEL,
    }),
    cylinder({
      base: point(spot, STACK_HEIGHT - 0.02),
      radius: 0.0185,
      height: 0.02,
      sides: 6,
      colour: SOOT,
    }),
    ...stack.plume.map(({ drift, rise, radius }) =>
      puff({ spot: [stack.x + drift, STACK_Z], y: STACK_HEIGHT + rise, radius, colour: SMOKE }),
    ),
  ]);
}

function storageTank(spot: Spot): Triangles {
  return cylinder({
    base: point(spot, 0),
    radius: 0.048,
    height: 0.045,
    sides: 8,
    colour: TANK_WHITE,
  });
}

/** The process plant: its distillation columns standing on their steel frame. */
function processPlant(): Triangles {
  return merge([
    box({ base: point([0.265, 0.115], 0), size: extent([0.22, 0.025, 0.12]), colour: PLANT_FRAME }),
    ...COLUMNS.map(({ spot, height }) =>
      cylinder({ base: point(spot, 0), radius: 0.014, height, sides: 6, colour: COLUMN }),
    ),
  ]);
}

/** Pipe racks: one along the plant's north side, one down to the loading bay. */
function pipeRacks(): Triangles[] {
  return [
    box({ base: point([-0.2, -0.14], 0), size: extent([0.4, 0.022, 0.014]), colour: PIPES }),
    box({ base: point([0.2, -0.14], 0), size: extent([0.4, 0.022, 0.014]), colour: PIPES }),
    box({ base: point([0.06, 0.12], 0), size: extent([0.014, 0.022, 0.5]), colour: PIPES }),
  ];
}

/** A lattice pylon carrying the power away: its tapering tower and its two cross-arms. */
function pylon(spot: Spot): Triangles {
  return merge([
    pyramid({ base: point(spot, 0), size: extent([0.03, 0.26, 0.03]), colour: PYLON }),
    box({ base: point(spot, 0.2), size: extent([0.005, 0.004, 0.08]), colour: PYLON }),
    box({ base: point(spot, 0.235), size: extent([0.005, 0.004, 0.06]), colour: PYLON }),
  ]);
}
