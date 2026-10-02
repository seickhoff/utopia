import type { KitStyle } from "../kit-style.js";
import { vaultRoof } from "../roof-shapes.js";
import { blob, cylinder } from "../round-shapes.js";
import { box, gableRoof, merge, placed, rgb, walls, type Triangles } from "../shapes.js";
import { fighterJet, helicopter } from "./aircraft.js";
import type { District } from "./district.js";
import { block, coach, extent, flag, ground, helipad, marking, point, type Spot } from "./props.js";

/** A runway's dark asphalt. */
export const RUNWAY = rgb("#3e4247");
const TAXIWAY = rgb("#565a60");
const APRON = rgb("#a9aaa5");
const RUNWAY_PAINT = rgb("#f1f1ec");
const JET_GREY = rgb("#8d949c");
const HANGAR = rgb("#7d8a7a");
const HANGAR_DOOR = rgb("#474d52");
const CONCRETE = rgb("#d4d2cb");
const TOWER_GLASS = rgb("#3d5a73");
const RADOME = rgb("#eef0f2");
const BARRACKS_WALLS = rgb("#c8b98f");
const BARRACKS_ROOF = rgb("#6f6650");
const ARMY_GREEN = rgb("#556b2f");
const GUN_METAL = rgb("#4d5240");
const HARDSTAND = rgb("#8e8f88");

const RUNWAY_Z = -0.3;
const RUNWAY_WIDTH = 0.075;
const RUNWAY_ENDS = 0.4;
const TAXIWAY_Z = -0.17;
const TAXIWAY_WIDTH = 0.035;
const LINKS = [-0.38, 0.38];
const JETS = [0.02, 0.12, 0.22, 0.32];
const HANGARS = [0.05, 0.18, 0.31];
const TOWER: Spot = [-0.15, -0.07];
const BARRACKS: readonly Spot[] = [
  [-0.33, 0.26],
  [-0.15, 0.26],
  [-0.33, 0.37],
  [-0.15, 0.37],
];
const TANKS = [0.08, 0.16, 0.24, 0.32];
const TRUCKS = [0.12, 0.26];
/** Facing north: toward the taxiway and the runway beyond it. */
const NORTHWARD = -Math.PI / 2;

/**
 * A fort as a modern air base: a runway across the square with its taxiway, fighters on the
 * apron, arched hangars, a control tower flying the side's flag, a radar dome and a helicopter on
 * its pad; then the army's barracks in rows and its tanks and trucks in the motor pool.
 */
export function fortDistrict(style: KitStyle): District {
  return {
    decals: [
      ...airfield(),
      ...runwayMarkings(),
      helipad({ spot: [-0.3, 0.1], y: 0.004, ring: style.accent }),
    ],
    structures: [
      controlTower(style),
      radarDome([-0.36, -0.07]),
      ...HANGARS.map(hangar),
      ...JETS.map((x) => fighterJet({ spot: [x, -0.085], turn: NORTHWARD, colour: JET_GREY })),
      helicopter({ spot: [-0.3, 0.1], turn: 0.4, colour: ARMY_GREEN }),
      ...BARRACKS.map(barracks),
      ...TANKS.map((x) => tank([x, 0.27])),
      ...TRUCKS.map((x) => coach({ spot: [x, 0.37], turn: 0, colour: ARMY_GREEN })),
    ],
  };
}

/** The runway, the taxiway and its links to the runway, the apron, and the motor pool's hardstand. */
function airfield(): Triangles[] {
  const [runwayEdge, taxiwayEdge] = [RUNWAY_Z + RUNWAY_WIDTH / 2, TAXIWAY_Z - TAXIWAY_WIDTH / 2];
  return [
    ground({ spot: [0, RUNWAY_Z], size: [0.92, RUNWAY_WIDTH], colour: RUNWAY }),
    ground({ spot: [0, TAXIWAY_Z], size: [0.79, TAXIWAY_WIDTH], colour: TAXIWAY }),
    ...LINKS.map((x) =>
      ground({
        spot: [x, (runwayEdge + taxiwayEdge) / 2],
        size: [TAXIWAY_WIDTH, taxiwayEdge - runwayEdge],
        colour: TAXIWAY,
      }),
    ),
    ground({ spot: [0.19, -0.08], size: [0.48, 0.14], colour: APRON }),
    ground({ spot: [0.2, 0.32], size: [0.32, 0.2], colour: HARDSTAND }),
  ];
}

/** The runway's dashed centre line, and the white bars across each of its ends. */
function runwayMarkings(): Triangles[] {
  const dashes = Array.from({ length: 9 }, (_, dash) => -0.33 + dash * 0.0825);
  const bars = [-0.026, -0.009, 0.009, 0.026];
  return [
    ...dashes.map((x) =>
      marking({ spot: [x, RUNWAY_Z], size: [0.035, 0.004], colour: RUNWAY_PAINT }),
    ),
    ...[-RUNWAY_ENDS, RUNWAY_ENDS].flatMap((x) =>
      bars.map((dz) =>
        marking({ spot: [x, RUNWAY_Z + dz], size: [0.04, 0.007], colour: RUNWAY_PAINT }),
      ),
    ),
  ];
}

/** The control tower over its operations block, its cab roofed in the side's colour: the landmark. */
function controlTower(style: KitStyle): Triangles {
  const [x, z] = TOWER;
  return merge([
    block({ spot: TOWER, size: [0.1, 0.04, 0.06], walls: CONCRETE, roof: HARDSTAND, storeys: 1 }),
    box({ base: point([x + 0.03, z], 0), size: extent([0.026, 0.13, 0.026]), colour: CONCRETE }),
    box({
      base: point([x + 0.03, z], 0.13),
      size: extent([0.046, 0.024, 0.046]),
      colour: TOWER_GLASS,
    }),
    box({
      base: point([x + 0.03, z], 0.154),
      size: extent([0.054, 0.006, 0.054]),
      colour: style.accent,
    }),
    flag({ spot: [x - 0.06, z + 0.045], height: 0.12, colour: style.accent }),
  ]);
}

/** A radar's white dome on its plinth. */
function radarDome(spot: Spot): Triangles {
  return merge([
    cylinder({ base: point(spot, 0), radius: 0.02, height: 0.02, sides: 6, colour: CONCRETE }),
    blob({
      base: point(spot, 0.016),
      radius: 0.03,
      height: 0.05,
      sides: 8,
      waist: 0.35,
      colour: RADOME,
    }),
  ]);
}

/** An arched hangar, its doors opening north onto the apron. */
function hangar(x: number): Triangles {
  const arch = merge([
    vaultRoof({
      base: point([0, 0], 0),
      size: extent([0.12, 0.055, 0.09]),
      colour: HANGAR,
      segments: 4,
    }),
    box({ base: point([-0.06, 0], 0), size: extent([0.004, 0.038, 0.066]), colour: HANGAR_DOOR }),
  ]);
  return placed(arch, { offset: point([x, 0.065], 0), turn: Math.PI / 2 });
}

function barracks(spot: Spot): Triangles {
  return merge([
    walls({ base: point(spot, 0), size: extent([0.15, 0.035, 0.055]), colour: BARRACKS_WALLS }),
    gableRoof({
      base: point(spot, 0.035),
      size: extent([0.156, 0.02, 0.062]),
      colour: BARRACKS_ROOF,
    }),
  ]);
}

/** A tank in the motor pool, its gun toward the runway. */
function tank(spot: Spot): Triangles {
  const vehicle = merge([
    box({ base: point([0, 0], 0), size: extent([0.06, 0.018, 0.036]), colour: ARMY_GREEN }),
    box({
      base: point([-0.004, 0], 0.018),
      size: extent([0.028, 0.013, 0.024]),
      colour: ARMY_GREEN,
    }),
    box({ base: point([0.028, 0], 0.022), size: extent([0.04, 0.005, 0.005]), colour: GUN_METAL }),
  ]);
  return placed(vehicle, { offset: point(spot, 0), turn: NORTHWARD });
}
