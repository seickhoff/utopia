import { cylinder } from "../round-shapes.js";
import { box, gableRoof, merge, pyramid, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { coach, extent, flag, ground, point, type Spot } from "./props.js";

const CAMOUFLAGE = [rgb("#5b6340"), rgb("#6b6b47"), rgb("#7a6e4f")];
const REBEL_RED = rgb("#b3261e");
const TRAMPLED = rgb("#8d7755");
const STONES = rgb("#6d6a64");
const FLAME = rgb("#f28c28");
const EMBER = rgb("#ffd34d");
const SANDBAGS = rgb("#b8a57a");
const CRATE = rgb("#7a5a36");
const TRUCK = rgb("#4f5a34");

const TENTS: readonly Spot[] = [
  [-0.3, -0.3],
  [-0.12, -0.34],
  [0.26, -0.3],
  [0.34, -0.1],
  [-0.34, 0.08],
  [0.3, 0.28],
];
const BARRICADES: readonly { spot: Spot; long: readonly [number, number] }[] = [
  { spot: [-0.2, 0.42], long: [0.22, 0.03] },
  { spot: [0.42, 0.1], long: [0.03, 0.2] },
  { spot: [-0.42, -0.16], long: [0.03, 0.2] },
];
const CRATES: readonly Spot[] = [
  [0.12, 0.3],
  [0.16, 0.34],
  [0.1, 0.36],
  [0.15, 0.39],
];

/**
 * A rebel camp: a command tent under a red flag, bivouac tents in camouflage, a campfire, sandbag
 * barricades, a stack of crates and a truck, on trampled ground.
 */
export function rebelCamp(): District {
  return {
    decals: [ground({ spot: [0, 0.08], size: [0.34, 0.24], colour: TRAMPLED })],
    structures: [commandTent(), ...bivouacs(), campfire([0, 0.18]), ...stores()],
  };
}

function commandTent(): Triangles {
  return merge([
    gableRoof({
      base: point([0, -0.02], 0),
      size: extent([0.16, 0.08, 0.12]),
      colour: CAMOUFLAGE[0],
    }),
    flag({ spot: [0.1, -0.08], height: 0.16, colour: REBEL_RED }),
  ]);
}

function bivouacs(): Triangles[] {
  return TENTS.map((spot, index) =>
    gableRoof({
      base: point(spot, 0),
      size: extent([0.08, 0.05, 0.06]),
      colour: CAMOUFLAGE[index % 3],
    }),
  );
}

/** Sandbag barricades, a stack of crates and the truck. */
function stores(): Triangles[] {
  return [
    ...BARRICADES.map(({ spot, long }) =>
      box({ base: point(spot, 0), size: extent([long[0], 0.025, long[1]]), colour: SANDBAGS }),
    ),
    ...CRATES.map((spot) =>
      box({ base: point(spot, 0), size: extent([0.03, 0.025, 0.03]), colour: CRATE }),
    ),
    coach({ spot: [-0.22, 0.24], turn: 0.3, colour: TRUCK }),
  ];
}

function campfire(spot: Spot): Triangles {
  return merge([
    cylinder({ base: point(spot, 0), radius: 0.03, height: 0.008, sides: 6, colour: STONES }),
    pyramid({ base: point(spot, 0.008), size: extent([0.024, 0.04, 0.024]), colour: FLAME }),
    pyramid({ base: point(spot, 0.008), size: extent([0.012, 0.028, 0.012]), colour: EMBER }),
  ]);
}
