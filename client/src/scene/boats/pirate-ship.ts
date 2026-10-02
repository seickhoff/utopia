import { flag, hullBand, hullDeck, rod, sail, type HullSpec } from "../boat-shapes.js";
import { cylinder } from "../round-shapes.js";
import { box, merge, rgb, triangles, type Triangles, type Vec3 } from "../shapes.js";

const at = ([x, y, z]: readonly [number, number, number]): Vec3 => ({ x, y, z });
const extent = ([x, y, z]: readonly [number, number, number]): Vec3 => ({ x, y, z });

const HULL: HullSpec = {
  length: 0.14,
  beam: 0.042,
  bow: 0.28,
  stern: 0.78,
  keel: -0.006,
  deck: 0.02,
  flare: 0.8,
};
const TARRED = rgb("#2c1f15");
const TIMBER = rgb("#4a3422");
const WALE = rgb("#6a4c30");
const PLANKS = rgb("#6b5236");
const SPARS = rgb("#3a2a1a");
const CANVAS = rgb("#a89f86");
const CORDAGE = rgb("#2a2018");
const IRON = rgb("#151515");
const LANTERN = rgb("#d9a441");
const JOLLY_ROGER = rgb("#141414");
const BONE = rgb("#e8e2d0");
const DECK = HULL.deck;

/** Each mast: where it stands, how tall, and the yards it carries, low to high, each with its sail. */
const MASTS: readonly {
  x: number;
  top: number;
  yards: readonly { y: number; span: number; drop: number }[];
}[] = [
  {
    x: 0.036,
    top: 0.13,
    yards: [
      { y: 0.07, span: 0.05, drop: 0.032 },
      { y: 0.108, span: 0.036, drop: 0.026 },
    ],
  },
  {
    x: 0.0,
    top: 0.15,
    yards: [
      { y: 0.075, span: 0.06, drop: 0.036 },
      { y: 0.122, span: 0.042, drop: 0.03 },
    ],
  },
  { x: -0.042, top: 0.1, yards: [{ y: 0.07, span: 0.04, drop: 0.026 }] },
];
const CANNON = [-0.03, -0.012, 0.006, 0.024, 0.042];

/**
 * A pirate ship: a weathered galleon in tarred timber with its forecastle and towering stern
 * castle, cannon run out along both sides, three masts with their yards and their torn sails, a
 * bowsprit and jib, the shrouds and stays, and the Jolly Roger flying from the mainmast.
 */
export function pirateShip(): Triangles {
  return merge([
    hullBand({ hull: HULL, from: HULL.keel, to: 0.006, colour: TARRED }),
    hullBand({ hull: HULL, from: 0.006, to: DECK - 0.004, colour: TIMBER }),
    hullBand({ hull: HULL, from: DECK - 0.004, to: DECK, colour: WALE }),
    hullDeck({ hull: HULL, colour: PLANKS }),
    ...castles(),
    ...CANNON.flatMap(cannon),
    ...MASTS.flatMap(mastAndSails),
    ...headRig(),
    ...shrouds(),
    ...colours(),
  ]);
}

/** The stern castle with its lanterns, and the forecastle. */
function castles(): Triangles[] {
  return [
    box({ base: at([-0.05, DECK, 0]), size: extent([0.042, 0.016, 0.036]), colour: TIMBER }),
    box({ base: at([-0.05, DECK + 0.016, 0]), size: extent([0.04, 0.002, 0.034]), colour: PLANKS }),
    box({
      base: at([-0.0715, DECK + 0.006, 0]),
      size: extent([0.002, 0.005, 0.024]),
      colour: LANTERN,
    }),
    box({ base: at([0.05, DECK, 0]), size: extent([0.026, 0.008, 0.03]), colour: TIMBER }),
  ];
}

/** A cannon run out through each side at this point along the gun deck. */
function cannon(x: number): Triangles[] {
  return [-1, 1].map((side) =>
    rod({
      from: at([x, 0.012, side * 0.017]),
      to: at([x, 0.012, side * 0.026]),
      radius: 0.0012,
      sides: 4,
      colour: IRON,
    }),
  );
}

/** A mast, its fighting top, and its yards with their sails, filled by the wind and torn. */
function mastAndSails(mast: (typeof MASTS)[number]): Triangles[] {
  const { x } = mast;
  return [
    rod({
      from: at([x, DECK, 0]),
      to: at([x, mast.top, 0]),
      radius: 0.0016,
      sides: 5,
      colour: SPARS,
    }),
    cylinder({
      base: at([x, mast.top * 0.62, 0]),
      radius: 0.004,
      height: 0.002,
      sides: 6,
      colour: SPARS,
    }),
    ...mast.yards.flatMap((yard, index) => yardAndSail({ x, yard, seed: x * 13 + index })),
  ];
}

/** A yard across the mast, and the sail set from it. */
function yardAndSail(rigged: {
  x: number;
  yard: (typeof MASTS)[number]["yards"][number];
  seed: number;
}): Triangles[] {
  const { x, seed } = rigged;
  const { y, span, drop } = rigged.yard;
  const yard = { from: at([x + 0.002, y, -span / 2]), to: at([x + 0.002, y, span / 2]) };
  return [
    rod({ ...yard, radius: 0.0011, sides: 4, colour: SPARS }),
    sail({ yard, drop, ragged: 0.45, belly: 0.007, seed, colour: CANVAS }),
  ];
}

/** The bowsprit, and the jib set from the foremast out along it. */
function headRig(): Triangles[] {
  const tip = at([0.093, DECK + 0.022, 0]);
  const jib: Vec3[] = [at([0.04, 0.115, 0]), tip, at([0.05, DECK + 0.012, 0])];
  return [
    rod({ from: at([0.058, DECK + 0.004, 0]), to: tip, radius: 0.0015, sides: 4, colour: SPARS }),
    triangles({
      corners: jib.map(({ x, y, z }) => [x, y, z] as const),
      faces: [
        [0, 1, 2],
        [0, 2, 1],
      ],
      colour: CANVAS,
    }),
  ];
}

/** Each mast's shrouds down to the ship's sides, and the stays from mast to mast and to the bowsprit. */
function shrouds(): Triangles[] {
  const line = (from: Vec3, to: Vec3) =>
    rod({ from, to, radius: 0.0003, sides: 3, colour: CORDAGE });
  const sides = MASTS.flatMap(({ x, top }) =>
    [-1, 1].map((side) => line(at([x, top * 0.62, 0]), at([x - 0.008, DECK, side * 0.02]))),
  );
  return [
    ...sides,
    line(at([0, 0.15, 0]), at([0.036, 0.11, 0])),
    line(at([0.036, 0.13, 0]), at([0.093, DECK + 0.022, 0])),
    line(at([-0.042, 0.1, 0]), at([0, 0.12, 0])),
  ];
}

/** The Jolly Roger at the mainmast's head, its skull on both faces, and a long black pennant from the foremast. */
function colours(): Triangles[] {
  return [
    flag({ hoist: at([0, 0.13, 0]), length: 0.03, height: 0.02, colour: JOLLY_ROGER }),
    ...[-1, 1].map((side) =>
      flag({
        hoist: at([-0.011, 0.136, side * 0.0007]),
        length: 0.008,
        height: 0.008,
        colour: BONE,
      }),
    ),
    flag({ hoist: at([0.036, 0.125, 0]), length: 0.045, height: 0.004, colour: JOLLY_ROGER }),
  ];
}
