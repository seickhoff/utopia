import { NOBODY, SIDES, opponentOf, type Side } from "../board/side.js";
import { footprintsTouch, touchesForeground } from "../collision/overlap.js";
import type { Playfield } from "../collision/playfield.js";
import type { Footprint } from "../collision/sprite-shape.js";
import { squareUnder } from "../geometry/pixel-point.js";
import type { Aboard } from "../pilots/pilot-mode.js";
import type { Drifter } from "../sea/drifter.js";
import { sinksVessels, isWeather } from "../sea/weather-kind.js";
import {
  fishOverLand,
  landCatch,
  ram,
  sinkPilot,
  sinkPirate,
  weatherOverLand,
} from "./encounters.js";
import type { World } from "./world.js";

interface PilotContact {
  readonly side: Side;
  readonly playfield: Playfield;
}

/** What a sailed boat reacts to, by the ROM table of the boat (F_BO_MOB_TBL, PTBO_MOB_TBL). */
const PILOT_REACTIONS: Readonly<Record<Aboard, (world: World, contact: PilotContact) => void>> = {
  none: () => {},
  fishingBoat: fishingBoatContacts,
  ptBoat: ptBoatContacts,
};

/**
 * The frame's collisions, as the EXEC dispatches them: each sprite, in MOB slot order, reacts to
 * the land and to the sprites its ROM table lists.
 */
export function resolveContacts(world: World): void {
  const playfield = world.playfield.current();
  for (const weather of world.sea.inGroup("weather")) {
    if (touchesForeground(weather.footprint(), playfield)) weatherOverLand(world, weather);
  }
  SIDES.forEach((side) => pilotContacts(world, { side, playfield }));
  world.sea.inGroup("pirates").forEach((pirate) => pirateContacts(world, { pirate, playfield }));
  for (const fish of world.sea.inGroup("fish")) {
    if (touchesForeground(fish.footprint(), playfield)) fishOverLand(world, fish);
  }
}

function pilotContacts(world: World, contact: PilotContact): void {
  const mode = world.pilots[contact.side].mode();
  if (mode.name === "sailing") PILOT_REACTIONS[mode.aboard](world, contact);
}

function fishingBoatContacts(world: World, contact: PilotContact): void {
  const { side } = contact;
  const pilot = world.pilots[side];
  const own = pilot.footprint();
  if (touchesAny(own, hurricanes(world))) return sinkPilot(world, { side, cause: "hurricane" });
  if (isRammedByPtBoat(world, side)) return sinkPilot(world, { side, cause: "ptBoat" });
  if (isCaughtByPirates(world, side)) return sinkPilot(world, { side, cause: "pirate" });
  const square = squareUnder(pilot.point());
  world.sea
    .inGroup("fish")
    .filter((fish) => footprintsTouch(own, fish.footprint()))
    .forEach(() => landCatch(world, { side, square }));
}

/** L_55BF: an enemy PT boat sinks a fishing boat under way, unless its owner's fort is near. */
function isRammedByPtBoat(world: World, side: Side): boolean {
  const enemy = world.pilots[opponentOf(side)];
  const own = world.pilots[side];
  if (enemy.mode().name !== "sailing" || enemy.mode().aboard !== "ptBoat") return false;
  if (!footprintsTouch(own.footprint(), enemy.footprint())) return false;
  return world.board.fortNear(squareUnder(own.point())) !== side;
}

/** L_5620: pirates sink a fishing boat under way, unless any fort is near. */
function isCaughtByPirates(world: World, side: Side): boolean {
  const own = world.pilots[side];
  if (!touchesAny(own.footprint(), afloat(world.sea.inGroup("pirates")))) return false;
  return world.board.fortNear(squareUnder(own.point())) === NOBODY;
}

function ptBoatContacts(world: World, contact: PilotContact): void {
  const { side, playfield } = contact;
  const pilot = world.pilots[side];
  const own = pilot.footprint();
  if (touchesForeground(own, playfield)) {
    ram(world, { point: pilot.point(), spares: side, cause: "ptBoat" });
  }
  if (touchesAny(own, hurricanes(world))) return sinkPilot(world, { side, cause: "hurricane" });
  afloat(world.sea.inGroup("pirates"))
    .filter((pirate) => footprintsTouch(own, pirate.footprint()))
    .forEach((pirate) => pirate.halt());
}

interface PirateContact {
  readonly pirate: Drifter;
  readonly playfield: Playfield;
}

function pirateContacts(world: World, contact: PirateContact): void {
  const { pirate, playfield } = contact;
  if (pirate.isSinking()) return;
  if (touchesForeground(pirate.footprint(), playfield)) {
    ram(world, { point: pirate.point(), spares: NOBODY, cause: "pirate" });
  }
  if (touchesAny(pirate.footprint(), hurricanes(world))) sinkPirate(world, pirate);
}

function hurricanes(world: World): Drifter[] {
  return world.sea
    .inGroup("weather")
    .filter((weather) => isWeather(weather.kind) && sinksVessels(weather.kind));
}

function afloat(drifters: readonly Drifter[]): Drifter[] {
  return drifters.filter((drifter) => !drifter.isSinking());
}

function touchesAny(footprint: Footprint, drifters: readonly Drifter[]): boolean {
  return drifters.some((drifter) => footprintsTouch(footprint, drifter.footprint()));
}
