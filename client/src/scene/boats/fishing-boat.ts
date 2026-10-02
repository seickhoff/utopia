import type { KitStyle } from "../kit-style.js";
import { hullBand, hullDeck, rod, type HullSpec, type RodSpec } from "../boat-shapes.js";
import { arc, ribbon } from "../path-shapes.js";
import { box, merge, rgb, type Triangles, type Vec3 } from "../shapes.js";

const at = ([x, y, z]: readonly [number, number, number]): Vec3 => ({ x, y, z });
const extent = ([x, y, z]: readonly [number, number, number]): Vec3 => ({ x, y, z });

const HULL: HullSpec = {
  length: 0.11,
  beam: 0.034,
  bow: 0.36,
  stern: 0.9,
  keel: -0.005,
  deck: 0.012,
  flare: 0.78,
};
const BLACK_HULL = rgb("#22262a");
const BOTTOM_RED = rgb("#8e2a22");
const RAIL_WHITE = rgb("#d9d9d4");
const WORK_DECK = rgb("#5b5e5f");
const WHEELHOUSE = rgb("#e3e1da");
const GLASS = rgb("#2a333c");
const RIGGING = rgb("#2b2b2b");
const NET = rgb("#2f3533");
const CORKS = rgb("#e8e2cf");
const SKIFF = rgb("#d9622b");
const OILSKINS = rgb("#ff7a1a");
const BOOT_TOP = 0.002;
const RAIL = 0.0018;
const DECK = HULL.deck;
const MAST_TOP = DECK + 0.06;

/**
 * A fishing boat as a purse seiner: a black hull over its red bottom with a white rail, the
 * wheelhouse forward roofed in the side's colour, the mast and its stays, the boom of the power
 * block reaching out over the stern, the net piled on the work deck with its corks, the skiff
 * riding on the stern, and the crew in their orange oilskins.
 */
export function fishingBoat(style: KitStyle): Triangles {
  return merge([
    hullBand({ hull: HULL, from: HULL.keel, to: BOOT_TOP, colour: BOTTOM_RED }),
    hullBand({ hull: HULL, from: BOOT_TOP, to: DECK - RAIL, colour: BLACK_HULL }),
    hullBand({ hull: HULL, from: DECK - RAIL, to: DECK, colour: RAIL_WHITE }),
    hullDeck({ hull: HULL, colour: WORK_DECK }),
    ...wheelhouse(style),
    ...rigging(),
    ...netPile(),
  ]);
}

/** The ring of corks a fishing boat at anchor has set out on the water astern, its net hanging from it. */
export function setNet(): Triangles {
  const corks = arc({ centre: [-0.085, 0.03], radius: 0.034, from: -1.4, to: 3.9, steps: 10 });
  return ribbon({ path: corks, width: 0.0025, top: 0.002, colour: CORKS });
}

function wheelhouse(style: KitStyle): Triangles[] {
  return [
    box({ base: at([0.02, DECK, 0]), size: extent([0.03, 0.014, 0.024]), colour: WHEELHOUSE }),
    box({ base: at([0.02, DECK + 0.008, 0]), size: extent([0.031, 0.004, 0.025]), colour: GLASS }),
    box({
      base: at([0.02, DECK + 0.014, 0]),
      size: extent([0.033, 0.002, 0.026]),
      colour: style.accent,
    }),
  ];
}

/** The mast, its crossbar, and the power block's boom reaching out over the stern. */
const SPARS: readonly Omit<RodSpec, "colour">[] = [
  { from: at([0.002, DECK, 0]), to: at([0.002, MAST_TOP, 0]), radius: 0.001, sides: 4 },
  {
    from: at([0.002, MAST_TOP - 0.01, -0.011]),
    to: at([0.002, MAST_TOP - 0.01, 0.011]),
    radius: 0.0007,
    sides: 3,
  },
  { from: at([0.0, DECK + 0.012, 0]), to: at([-0.046, DECK + 0.052, 0]), radius: 0.0012, sides: 4 },
];
/** The stays from the masthead to the bow and to the stern's two quarters. */
const STAYS: readonly Vec3[] = [
  at([0.052, DECK, 0]),
  at([-0.05, DECK, 0.013]),
  at([-0.05, DECK, -0.013]),
];

/** The mast and its crossbar, its stays to the bow and the stern, and the power block's boom. */
function rigging(): Triangles[] {
  const masthead = at([0.002, MAST_TOP, 0]);
  return [
    ...SPARS.map((spar) => rod({ ...spar, colour: RIGGING })),
    box({
      base: at([-0.046, DECK + 0.046, 0]),
      size: extent([0.005, 0.006, 0.004]),
      colour: RIGGING,
    }),
    ...STAYS.map((to) => rod({ from: masthead, to, radius: 0.0003, sides: 3, colour: RIGGING })),
  ];
}

/** The net piled on the work deck with its corks on top, the skiff on the stern, and two of the crew. */
function netPile(): Triangles[] {
  return [
    box({ base: at([-0.028, DECK, 0]), size: extent([0.034, 0.008, 0.024]), colour: NET }),
    box({ base: at([-0.028, DECK + 0.008, 0]), size: extent([0.03, 0.002, 0.018]), colour: CORKS }),
    box({ base: at([-0.05, DECK, 0]), size: extent([0.012, 0.006, 0.02]), colour: SKIFF }),
    box({ base: at([-0.012, DECK, 0.009]), size: extent([0.003, 0.006, 0.003]), colour: OILSKINS }),
    box({ base: at([-0.04, DECK, -0.011]), size: extent([0.003, 0.006, 0.003]), colour: OILSKINS }),
  ];
}
