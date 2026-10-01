import { isBoat, type BoatKind, type ItemKind } from "../board/item-kind.js";
import { NOBODY, type Holder, type Side } from "../board/side.js";
import { isItem } from "../board/square-content.js";
import { squareUnder, type PixelPoint } from "../geometry/pixel-point.js";
import type { Square } from "../geometry/square.js";
import type { Drifter } from "../sea/drifter.js";
import { isWeather, type WeatherKind } from "../sea/weather-kind.js";
import { cellOf } from "./cell.js";
import type { WreckCause } from "./game-event.js";
import type { World } from "./world.js";

/**
 * WTHR_V_LAND: weather over the land wears down whatever stands under it, a little for a storm,
 * five times as much for a hurricane; and any weather over a crop brings in gold.
 */
export function weatherOverLand(world: World, weather: Drifter): void {
  const kind = weather.kind;
  if (!isWeather(kind)) return;
  const square = squareUnder(weather.point());
  const { occupant, holder } = world.board.contentAt(square);
  if (isItem(occupant) && holder !== NOBODY) wearDown(world, { square, side: holder, kind });
  showerCrop(world, square);
}

interface Onslaught {
  readonly square: Square;
  readonly side: Side;
  readonly kind: WeatherKind;
}

function wearDown(world: World, onslaught: Onslaught): void {
  const damage = world.tallies[onslaught.side].stormDamage;
  damage.add(world.rules.sea.weather.damage[onslaught.kind]);
  if (!damage.isFull()) return;
  damage.empty();
  const { occupant } = world.board.contentAt(onslaught.square);
  if (isBoat(occupant))
    return wreckBoat(world, { ...onslaught, boat: occupant, cause: onslaught.kind });
  if (isItem(occupant)) levelBuilding(world, { ...onslaught, item: occupant });
}

interface Levelling extends Onslaught {
  readonly item: ItemKind;
}

function levelBuilding(world: World, levelling: Levelling): void {
  const { square, side, kind, item } = levelling;
  world.board.raze(square);
  const casualties = world.dice.fortune.roll(world.rules.sea.weather.casualtySides);
  world.islands[side].losePeople(casualties);
  const cell = cellOf(square);
  world.events.record({ type: "itemSmitten", side, item, cell, cause: kind, casualties });
}

function showerCrop(world: World, square: Square): void {
  const { occupant, holder } = world.board.contentAt(square);
  if (occupant !== "crop" || holder === NOBODY) return;
  const showers = world.tallies[holder].showers;
  showers.add(1);
  if (!showers.isFull()) return;
  showers.empty();
  earnGold(world, { side: holder, source: "rain", square });
}

/** PARK_FISH: a school passing under an anchored fishing boat is fished by its owner. */
export function fishOverLand(world: World, fish: Drifter): void {
  const square = squareUnder(fish.point());
  const { occupant, holder } = world.board.contentAt(square);
  if (occupant === "fishingBoat" && holder !== NOBODY) landCatch(world, { side: holder, square });
}

export interface Catch {
  readonly side: Side;
  readonly square: Square;
}

/** Every moment over a school counts; each 50 bring a gold bar (and a pling). */
export function landCatch(world: World, haul: Catch): void {
  const fishing = world.tallies[haul.side].fishing;
  fishing.add(1);
  if (!fishing.isFull()) return;
  fishing.empty();
  earnGold(world, { ...haul, source: "fishing" });
}

interface Earning extends Catch {
  readonly source: "fishing" | "rain";
}

function earnGold(world: World, earning: Earning): void {
  world.islands[earning.side].earn(1);
  const { side, source, square } = earning;
  world.events.record({ type: "goldEarned", side, source, cell: cellOf(square) });
}

/** A pirate, or an enemy PT boat, bumping an anchored fishing boat. */
export interface Rammer {
  readonly point: PixelPoint;
  /** Whose boats it leaves alone: a PT boat its own side's; pirates nobody's. */
  readonly spares: Holder;
  readonly cause: "pirate" | "ptBoat";
}

/** L_54F8: twenty bumps sink an anchored fishing boat, unless its owner's fort is beside it. */
export function ram(world: World, rammer: Rammer): void {
  const square = squareUnder(rammer.point);
  const { occupant, holder } = world.board.contentAt(square);
  if (occupant !== "fishingBoat" || holder === NOBODY || holder === rammer.spares) return;
  if (world.board.fortNear(square) === holder) return;
  const ramming = world.tallies[holder].ramming;
  ramming.add(1);
  if (!ramming.isFull()) return;
  ramming.empty();
  wreckBoat(world, { square, side: holder, boat: "fishingBoat", cause: rammer.cause });
}

interface Wrecking {
  readonly square: Square;
  readonly side: Side;
  readonly boat: BoatKind;
  readonly cause: WreckCause;
}

function wreckBoat(world: World, wrecking: Wrecking): void {
  world.board.wreck(wrecking.square);
  const { side, boat, cause } = wrecking;
  world.events.record({ type: "boatWrecked", side, boat, cell: cellOf(wrecking.square), cause });
}

export interface PilotLoss {
  readonly side: Side;
  readonly cause: WreckCause;
}

/** L_559A: a boat under way goes down, then its governor gets the cursor back. */
export function sinkPilot(world: World, loss: PilotLoss): void {
  const pilot = world.pilots[loss.side];
  const boat = pilot.mode().aboard;
  pilot.sink();
  world.events.record({ type: "pilotSinking", side: loss.side, boat, cause: loss.cause });
}

export function sinkPirate(world: World, pirate: Drifter): void {
  pirate.sink();
  world.events.record({ type: "pirateSinking", id: pirate.id });
}
