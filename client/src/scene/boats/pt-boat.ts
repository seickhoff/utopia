import type { KitStyle } from "../kit-style.js";
import { flag, hullBand, hullDeck, rod, type HullSpec } from "../boat-shapes.js";
import { blob, cylinder } from "../round-shapes.js";
import { box, merge, rgb, type Triangles, type Vec3 } from "../shapes.js";

const at = ([x, y, z]: readonly [number, number, number]): Vec3 => ({ x, y, z });
const extent = ([x, y, z]: readonly [number, number, number]): Vec3 => ({ x, y, z });

const HULL: HullSpec = {
  length: 0.15,
  beam: 0.034,
  bow: 0.42,
  stern: 0.85,
  keel: -0.004,
  deck: 0.012,
  flare: 0.72,
};
const NAVY_GREY = rgb("#6f747a");
const BOTTOM_RED = rgb("#9b2f24");
const DECK_GREY = rgb("#80858b");
const CABIN_GREY = rgb("#767b81");
const GLASS = rgb("#2a333c");
const GUNMETAL = rgb("#2b2e31");
const TUBE_GREY = rgb("#5b6066");
const LIFE_RING = rgb("#e9e4d8");
/** The red bottom paint shows just above the waterline, as the boot-top. */
const BOOT_TOP = 0.003;
const DECK = HULL.deck;

/** The torpedo tubes, two along each side: the forward pair beside the chart house, the aft pair astern. */
const TUBES: readonly { from: number; to: number; abeam: number }[] = [
  { from: 0.015, to: 0.058, abeam: 0.0125 },
  { from: -0.062, to: -0.02, abeam: 0.0135 },
];

/**
 * A PT boat, as the Elco boats were built: a long, low hull in navy grey over its red bottom, a
 * chart house with its bridge and windscreen, four torpedo tubes along the deck, the twin gun tubs,
 * a gun on the stern, a radar mast, a life ring forward, and the side's flag and colour.
 */
export function ptBoat(style: KitStyle): Triangles {
  return merge([
    hullBand({ hull: HULL, from: HULL.keel, to: BOOT_TOP, colour: BOTTOM_RED }),
    hullBand({ hull: HULL, from: BOOT_TOP, to: DECK, colour: NAVY_GREY }),
    hullDeck({ hull: HULL, colour: DECK_GREY }),
    ...chartHouse(style),
    ...TUBES.flatMap(torpedoTubes),
    ...gunTubs(),
    ...sternGun(),
    ...radarMast(),
    cylinder({
      base: at([0.046, DECK, 0.006]),
      radius: 0.003,
      height: 0.0012,
      sides: 6,
      colour: LIFE_RING,
    }),
    sternFlag(style),
  ]);
}

/** The chart house, its roof in the side's colour, the bridge on its forward end and its windscreen. */
function chartHouse(style: KitStyle): Triangles[] {
  return [
    box({ base: at([0.008, DECK, 0]), size: extent([0.04, 0.008, 0.018]), colour: CABIN_GREY }),
    box({
      base: at([0.008, DECK + 0.008, 0]),
      size: extent([0.03, 0.0015, 0.014]),
      colour: style.accent,
    }),
    box({
      base: at([0.024, DECK + 0.008, 0]),
      size: extent([0.012, 0.005, 0.014]),
      colour: CABIN_GREY,
    }),
    box({
      base: at([0.0305, DECK + 0.009, 0]),
      size: extent([0.002, 0.003, 0.0145]),
      colour: GLASS,
    }),
    box({ base: at([-0.02, DECK, 0]), size: extent([0.016, 0.005, 0.014]), colour: CABIN_GREY }),
  ];
}

/** A pair of torpedo tubes, one each side, angled a little out toward their muzzles. */
function torpedoTubes(tubes: { from: number; to: number; abeam: number }): Triangles[] {
  return [-1, 1].map((side) =>
    rod({
      from: at([tubes.from, DECK + 0.003, side * tubes.abeam]),
      to: at([tubes.to, DECK + 0.003, side * (tubes.abeam + 0.001)]),
      radius: 0.0028,
      sides: 6,
      colour: TUBE_GREY,
    }),
  );
}

/** The twin gun tubs either side of the chart house, their guns trained forward. */
function gunTubs(): Triangles[] {
  return [-1, 1].flatMap((side) => [
    cylinder({
      base: at([0.0, DECK, side * 0.0105]),
      radius: 0.0042,
      height: 0.007,
      sides: 6,
      colour: CABIN_GREY,
    }),
    rod({
      from: at([0.0, DECK + 0.007, side * 0.0105]),
      to: at([0.013, DECK + 0.009, side * 0.0105]),
      radius: 0.0008,
      sides: 3,
      colour: GUNMETAL,
    }),
  ]);
}

/** The gun on the stern, trained aft. */
function sternGun(): Triangles[] {
  return [
    cylinder({
      base: at([-0.06, DECK, 0]),
      radius: 0.004,
      height: 0.004,
      sides: 6,
      colour: GUNMETAL,
    }),
    rod({
      from: at([-0.06, DECK + 0.005, 0]),
      to: at([-0.075, DECK + 0.007, 0]),
      radius: 0.0009,
      sides: 3,
      colour: GUNMETAL,
    }),
  ];
}

/** The mast behind the bridge, with its radar dome. */
function radarMast(): Triangles[] {
  return [
    rod({
      from: at([0.012, DECK + 0.008, 0]),
      to: at([0.012, DECK + 0.034, 0]),
      radius: 0.0007,
      sides: 3,
      colour: GUNMETAL,
    }),
    blob({
      base: at([0.012, DECK + 0.032, 0]),
      radius: 0.003,
      height: 0.005,
      sides: 6,
      waist: 0.5,
      colour: CABIN_GREY,
    }),
  ];
}

/** The side's flag on its staff at the stern. */
function sternFlag(style: KitStyle): Triangles {
  return merge([
    rod({
      from: at([-0.072, DECK, 0]),
      to: at([-0.072, DECK + 0.024, 0]),
      radius: 0.0006,
      sides: 3,
      colour: GUNMETAL,
    }),
    flag({
      hoist: at([-0.072, DECK + 0.015, 0]),
      length: 0.012,
      height: 0.008,
      colour: style.accent,
    }),
  ]);
}
