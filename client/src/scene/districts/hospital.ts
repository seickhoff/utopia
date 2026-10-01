import type { KitStyle } from "../kit-style.js";
import { box, merge, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import {
  CAR_COLOURS,
  block,
  car,
  carPark,
  extent,
  ground,
  helipad,
  lane,
  point,
  tree,
  type BlockSpec,
  type Spot,
} from "./props.js";

const WHITE = rgb("#eef1f4");
const ROOF = rgb("#c4c9d0");
const RED = rgb("#d9312b");
const PAVING = rgb("#d6d1c6");
const CLINIC_WALLS = [rgb("#f2e6cc"), rgb("#dbe9f1"), rgb("#e9dfee"), rgb("#e3efdf")];

const TOWER: BlockSpec = {
  spot: [0.1, -0.2],
  size: [0.22, 0.3, 0.16],
  walls: WHITE,
  roof: ROOF,
  storeys: 4,
};
const WEST_WING: BlockSpec = {
  spot: [-0.22, -0.2],
  size: [0.3, 0.12, 0.16],
  walls: WHITE,
  roof: ROOF,
  storeys: 2,
};
const LINK: BlockSpec = {
  spot: [-0.04, -0.2],
  size: [0.08, 0.08, 0.08],
  walls: WHITE,
  roof: ROOF,
  storeys: 1,
};
const EMERGENCY: BlockSpec = {
  spot: [0.28, 0.08],
  size: [0.18, 0.08, 0.2],
  walls: WHITE,
  roof: ROOF,
  storeys: 1,
};

/** Specialty clinics round the campus, each its own small building. */
const CLINICS: readonly { spot: Spot; size: readonly [number, number, number] }[] = [
  { spot: [0.38, -0.33], size: [0.1, 0.07, 0.1] },
  { spot: [-0.36, -0.02], size: [0.12, 0.06, 0.1] },
  { spot: [0.12, 0.34], size: [0.12, 0.06, 0.1] },
  { spot: [0.34, 0.36], size: [0.1, 0.05, 0.1] },
];

const PARKED: readonly Spot[] = [
  [-0.38, 0.17],
  [-0.315, 0.17],
  [-0.185, 0.17],
  [-0.12, 0.17],
  [-0.38, 0.33],
  [-0.25, 0.33],
  [-0.185, 0.33],
];

const TREES: readonly Spot[] = [
  [-0.4, -0.42],
  [-0.22, -0.43],
  [-0.04, -0.42],
  [0.26, -0.42],
  [0.43, -0.12],
  [0.44, 0.16],
  [0.02, 0.42],
];

/**
 * A hospital's campus: a tower with a helipad on its roof, a ward wing, an emergency wing with its
 * red cross and an ambulance at the door, specialty clinics round the grounds, and a car park.
 */
export function hospitalDistrict(style: KitStyle): District {
  return {
    decals: [
      carPark({ spot: [-0.24, 0.25], size: [0.36, 0.3] }),
      ground({ spot: [0.1, -0.06], size: [0.28, 0.08], colour: PAVING }),
      lane({ from: [-0.02, 0.47], to: [-0.02, 0.0] }),
      lane({ from: [-0.02, 0.08], to: [0.16, 0.08] }),
    ],
    structures: [tower(style), ...wards(), ...traffic(), ...TREES.map((spot) => tree(spot, 0.05))],
  };
}

/** The ward wing and its link to the tower, the emergency wing, and the specialty clinics. */
function wards(): Triangles[] {
  return [
    merge([block(WEST_WING), block(LINK)]),
    emergencyWing(),
    ...CLINICS.map((clinic, index) =>
      block({ ...clinic, walls: CLINIC_WALLS[index], roof: ROOF, storeys: 1 }),
    ),
  ];
}

/** The ambulance at the emergency door, and the cars in the car park. */
function traffic(): Triangles[] {
  return [
    ambulance([0.08, 0.08]),
    ...PARKED.map((spot, index) =>
      car({ spot, turn: Math.PI / 2, colour: CAR_COLOURS[index % CAR_COLOURS.length] }),
    ),
  ];
}

function tower(style: KitStyle): Triangles {
  const roof = TOWER.size[1] + 0.005;
  return merge([block(TOWER), helipad({ spot: TOWER.spot, y: roof, ring: style.accent })]);
}

/** The emergency wing: a red cross on its roof and a red porch over the door. */
function emergencyWing(): Triangles {
  const [x, z] = EMERGENCY.spot;
  const roof = EMERGENCY.size[1] + 0.005;
  return merge([
    block(EMERGENCY),
    box({ base: point([x, z], roof), size: extent([0.1, 0.003, 0.03]), colour: RED }),
    box({ base: point([x, z], roof), size: extent([0.03, 0.003, 0.1]), colour: RED }),
    box({ base: point([x - 0.11, z], 0.03), size: extent([0.04, 0.006, 0.1]), colour: RED }),
  ]);
}

function ambulance(spot: Spot): Triangles {
  return merge([
    car({ spot, turn: 0, colour: WHITE }),
    box({ base: point(spot, 0.024), size: extent([0.03, 0.003, 0.012]), colour: RED }),
  ]);
}
