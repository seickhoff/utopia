import type { BoatKind } from "@utopia/engine";
import type { KitStyle } from "./kit-style.js";
import { box, merge, placed, pyramid, rgb, sheet, type Triangles, type Vec3 } from "./shapes.js";

/** A square of sea holds a fleet: a player's fishing boats or PT boats, or a band of pirates. */
export type FleetKind = BoatKind | "pirate";

/**
 * A boat's place in its fleet: how far ahead of the fleet's middle and how far to starboard, and
 * how far round from the fleet's heading it swings when lying at anchor.
 */
interface Berth {
  readonly ahead: number;
  readonly abeam: number;
  readonly swing: number;
}

const WHITE = rgb("#eceae2");
const HULL_GREY = rgb("#8a8f99");
const DECK = rgb("#a67c4e");
const MAST = rgb("#3a2a1a");
const PIRATE_HULL = rgb("#6b4429");
const PIRATE_DECK = rgb("#a07a4e");
const PIRATE_SAIL = rgb("#2e2a33");
const BONE = rgb("#f1ead8");
const FOAM = rgb("#ffffff");
/** Moored boats lie closer together than boats in formation. */
const MOORED = 0.8;
const STERN = -0.07;

/** Each fleet's formation under way, leading boat first. */
const FORMATIONS: Readonly<Record<FleetKind, readonly Berth[]>> = {
  fishingBoat: [
    { ahead: 0.24, abeam: 0, swing: 0.4 },
    { ahead: 0.07, abeam: -0.16, swing: -0.9 },
    { ahead: 0.07, abeam: 0.16, swing: 1.3 },
    { ahead: -0.1, abeam: -0.3, swing: 2.2 },
    { ahead: -0.1, abeam: 0.3, swing: -2.6 },
    { ahead: -0.22, abeam: 0.02, swing: 3.0 },
  ],
  ptBoat: [
    { ahead: 0.2, abeam: 0, swing: 0.2 },
    { ahead: 0.02, abeam: -0.14, swing: -0.5 },
    { ahead: 0.02, abeam: 0.14, swing: 0.6 },
    { ahead: -0.16, abeam: 0, swing: -0.3 },
  ],
  pirate: [
    { ahead: 0.17, abeam: -0.1, swing: 0.9 },
    { ahead: 0.0, abeam: 0.14, swing: -1.2 },
    { ahead: -0.18, abeam: -0.05, swing: 2.4 },
  ],
};

/** A fleet under way: every boat in its place in the formation, all heading ahead (+x). */
export function fleetUnderWay(kind: FleetKind, style: KitStyle): Triangles {
  return merge(
    FORMATIONS[kind].map((berth) =>
      placed(boatOf(kind, style), { offset: at(berth.ahead, berth.abeam), turn: 0 }),
    ),
  );
}

/** A fleet at anchor: its boats closer together, each swung to its own cable. */
export function fleetAtAnchor(kind: FleetKind, style: KitStyle): Triangles {
  return merge(
    FORMATIONS[kind].map((berth) =>
      placed(boatOf(kind, style), {
        offset: at(berth.ahead * MOORED, berth.abeam * MOORED),
        turn: berth.swing,
      }),
    ),
  );
}

/** The white wakes a fleet under way leaves: a V spreading back from each boat's stern. */
export function fleetWakes(kind: FleetKind): Triangles {
  return merge(FORMATIONS[kind].map((berth) => wake(at(berth.ahead, berth.abeam))));
}

function wake(boat: Vec3): Triangles {
  const arm = (side: number) =>
    placed(sheet({ width: 0.16, depth: 0.012, cuts: 1, top: 0.004, colour: FOAM }), {
      offset: { x: boat.x + STERN - 0.07, y: 0, z: boat.z + side * 0.028 },
      turn: side * 0.32,
    });
  return merge([arm(-1), arm(1)]);
}

const at = (ahead: number, abeam: number): Vec3 => ({ x: ahead, y: 0, z: abeam });

const BOATS: Readonly<Record<FleetKind, (style: KitStyle) => Triangles>> = {
  fishingBoat: trawler,
  ptBoat: patrolBoat,
  pirate: raider,
};

/** One boat of a fleet, heading ahead (+x) from the middle of its hull. */
export function boatOf(kind: FleetKind, style: KitStyle): Triangles {
  return BOATS[kind](style);
}

/** How many boats a fleet has. */
export function fleetSize(kind: FleetKind): number {
  return FORMATIONS[kind].length;
}

/** A small trawler: white hull striped in the side's colour, a wheelhouse aft and a mast. */
function trawler(style: KitStyle): Triangles {
  return merge([
    box({ base: at(0, 0), size: size([0.12, 0.022, 0.045]), colour: WHITE }),
    pyramid({ base: at(0.07, 0), size: size([0.03, 0.022, 0.045]), colour: WHITE }),
    box({
      base: { x: 0, y: 0.018, z: 0 },
      size: size([0.122, 0.006, 0.047]),
      colour: style.accent,
    }),
    box({ base: { x: -0.03, y: 0.024, z: 0 }, size: size([0.034, 0.022, 0.032]), colour: WHITE }),
    box({ base: { x: 0.03, y: 0.024, z: 0 }, size: size([0.035, 0.004, 0.036]), colour: DECK }),
    box({ base: { x: 0.012, y: 0.024, z: 0 }, size: size([0.004, 0.05, 0.004]), colour: MAST }),
  ]);
}

/** A PT boat: a low, sleek grey hull with a pointed bow, its side's stripe and a low cabin. */
function patrolBoat(style: KitStyle): Triangles {
  return merge([
    box({ base: at(-0.01, 0), size: size([0.12, 0.018, 0.036]), colour: HULL_GREY }),
    pyramid({ base: at(0.07, 0), size: size([0.04, 0.018, 0.036]), colour: HULL_GREY }),
    box({
      base: { x: -0.01, y: 0.014, z: 0 },
      size: size([0.122, 0.005, 0.037]),
      colour: style.accent,
    }),
    box({
      base: { x: -0.02, y: 0.019, z: 0 },
      size: size([0.04, 0.014, 0.024]),
      colour: HULL_GREY,
    }),
    box({ base: { x: 0.03, y: 0.019, z: 0 }, size: size([0.014, 0.008, 0.008]), colour: MAST }),
  ]);
}

/** A pirate raider: a timber hull, a mast with a black square sail, a skull on the sail. */
function raider(): Triangles {
  return merge([
    box({ base: at(0, 0), size: size([0.13, 0.028, 0.05]), colour: PIRATE_HULL }),
    pyramid({ base: at(0.075, 0), size: size([0.03, 0.028, 0.05]), colour: PIRATE_HULL }),
    box({ base: { x: 0, y: 0.028, z: 0 }, size: size([0.11, 0.004, 0.042]), colour: PIRATE_DECK }),
    box({ base: { x: 0.01, y: 0.028, z: 0 }, size: size([0.005, 0.1, 0.005]), colour: MAST }),
    box({
      base: { x: 0.01, y: 0.05, z: 0 },
      size: size([0.004, 0.06, 0.074]),
      colour: PIRATE_SAIL,
    }),
    box({ base: { x: 0.01, y: 0.07, z: 0 }, size: size([0.006, 0.018, 0.018]), colour: BONE }),
  ]);
}

function size([x, y, z]: readonly [number, number, number]): Vec3 {
  return { x, y, z };
}
