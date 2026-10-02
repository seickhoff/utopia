import type { BoatKind } from "@utopia/engine";
import type { KitStyle } from "./kit-style.js";
import { fishingBoat, setNet } from "./boats/fishing-boat.js";
import { pirateShip } from "./boats/pirate-ship.js";
import { ptBoat } from "./boats/pt-boat.js";
import { merge, placed, rgb, sheet, type Triangles, type Vec3 } from "./shapes.js";

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

const FOAM = rgb("#ffffff");
/** Moored boats lie closer together than boats in formation. */
const MOORED = 0.8;
/** Where each kind of boat's stern is, behind its middle: its wake begins there. */
const STERNS: Readonly<Record<FleetKind, number>> = {
  fishingBoat: -0.055,
  ptBoat: -0.075,
  pirate: -0.072,
};
/** Spreads the boats' own numbers evenly from 0 to 1, so no two of a fleet move alike. */
const GOLDEN_SHARE = 0.618034;
const NOTHING: Triangles = { positions: [], colors: [] };

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

/** A fleet's boats, every corner tagged with its own boat's berth, so each can be given a little play. */
export interface BerthedFleet {
  readonly triangles: Triangles;
  /** Three numbers a corner: its boat's middle ahead and abeam, and that boat's own number from 0 to 1. */
  readonly berths: Float32Array;
}

/** A fleet under way: every boat in its place in the formation, all heading ahead (+x). */
export function fleetUnderWay(kind: FleetKind, style: KitStyle): Triangles {
  return berthedFleetUnderWay(kind, style).triangles;
}

/** A fleet under way, each boat's corners tagged with its berth. */
export function berthedFleetUnderWay(kind: FleetKind, style: KitStyle): BerthedFleet {
  return berthed(
    FORMATIONS[kind].map((berth) => ({
      berth,
      part: placed(boatOf(kind, style), { offset: at(berth.ahead, berth.abeam), turn: 0 }),
    })),
  );
}

/** A fleet at anchor: its boats closer together, each swung to its own cable, with whatever it has out. */
export function fleetAtAnchor(kind: FleetKind, style: KitStyle): Triangles {
  const moored = merge([boatOf(kind, style), AT_ANCHOR[kind]()]);
  return merge(
    FORMATIONS[kind].map((berth) =>
      placed(moored, {
        offset: at(berth.ahead * MOORED, berth.abeam * MOORED),
        turn: berth.swing,
      }),
    ),
  );
}

/** The white wakes a fleet under way leaves, as its picture shows them: a V spreading back from each boat's stern. */
export function fleetWakes(kind: FleetKind): Triangles {
  return merge(
    FORMATIONS[kind].map((berth) =>
      wake({ boat: at(berth.ahead, berth.abeam), stern: STERNS[kind] }),
    ),
  );
}

/** How far astern a boat's wake runs before it is lost in the sea, and how far its V spreads. */
export const WAKE_LENGTH = 0.36;
/** The tangent of the Kelvin angle, 19.47°: every wake's arms spread at it, whatever the boat. */
export const KELVIN_SPREAD = 0.3536;
const WAKE_HEIGHT = 0.003;

/** The patches of sea a fleet under way churns up behind it, one a boat, for the wake's shader to draw on. */
export interface WakePatches {
  /** Six corners a boat: two triangles laid on the water from its stern back. */
  readonly positions: Float32Array;
  /** Two numbers a corner: how far astern of its boat's stern it lies, and how far to starboard of its track. */
  readonly wake: Float32Array;
  /** Three numbers a corner: its boat's berth, so the wake follows its boat's play. */
  readonly berths: Float32Array;
}

/** A patch of sea astern of each boat, wide enough for its wake's V, measured from the boat's stern. */
export function fleetWakePatches(kind: FleetKind): WakePatches {
  const half = WAKE_LENGTH * KELVIN_SPREAD + 0.02;
  const corners: readonly (readonly [number, number])[] = [
    [0, -half],
    [0, half],
    [WAKE_LENGTH, half],
    [0, -half],
    [WAKE_LENGTH, half],
    [WAKE_LENGTH, -half],
  ];
  const tagged = berthed(
    FORMATIONS[kind].map((berth) => ({
      berth,
      part: wakePatch({ boat: at(berth.ahead, berth.abeam), stern: STERNS[kind], corners }),
    })),
  );
  const wake = Float32Array.from(FORMATIONS[kind].flatMap(() => corners.flat()));
  return { positions: Float32Array.from(tagged.triangles.positions), wake, berths: tagged.berths };
}

function wakePatch(laying: {
  boat: Vec3;
  stern: number;
  corners: readonly (readonly [number, number])[];
}): Triangles {
  const { boat, stern } = laying;
  const positions = laying.corners.flatMap(([astern, abeam]) => [
    boat.x + stern - astern,
    WAKE_HEIGHT,
    boat.z + abeam,
  ]);
  return { positions, colors: positions.map(() => 1) };
}

function wake(behind: { boat: Vec3; stern: number }): Triangles {
  const { boat, stern } = behind;
  const arm = (side: number) =>
    placed(sheet({ width: 0.16, depth: 0.012, cuts: 1, top: 0.004, colour: FOAM }), {
      offset: { x: boat.x + stern - 0.07, y: 0, z: boat.z + side * 0.028 },
      turn: side * 0.32,
    });
  return merge([arm(-1), arm(1)]);
}

/** The boats' parts joined, and every corner tagged with the berth of the boat it belongs to. */
function berthed(boats: readonly { berth: Berth; part: Triangles }[]): BerthedFleet {
  const corners = boats.reduce((sum, { part }) => sum + part.positions.length / 3, 0);
  const berths = new Float32Array(corners * 3);
  let corner = 0;
  boats.forEach(({ berth, part }, index) => {
    const tag = [berth.ahead, berth.abeam, (index * GOLDEN_SHARE) % 1];
    for (let each = 0; each < part.positions.length / 3; each += 1)
      berths.set(tag, (corner + each) * 3);
    corner += part.positions.length / 3;
  });
  return { triangles: merge(boats.map(({ part }) => part)), berths };
}

const at = (ahead: number, abeam: number): Vec3 => ({ x: ahead, y: 0, z: abeam });

const BOATS: Readonly<Record<FleetKind, (style: KitStyle) => Triangles>> = {
  fishingBoat,
  ptBoat,
  pirate: pirateShip,
};

/** What a boat has out on the water while it lies at anchor: a fishing boat its net, the rest nothing. */
const AT_ANCHOR: Readonly<Record<FleetKind, () => Triangles>> = {
  fishingBoat: setNet,
  ptBoat: () => NOTHING,
  pirate: () => NOTHING,
};

/** One boat of a fleet, heading ahead (+x) from the middle of its hull. */
export function boatOf(kind: FleetKind, style: KitStyle): Triangles {
  return BOATS[kind](style);
}

/** How many boats a fleet has. */
export function fleetSize(kind: FleetKind): number {
  return FORMATIONS[kind].length;
}
