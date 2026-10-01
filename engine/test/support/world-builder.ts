import type { BoatKind } from "../../src/board/item-kind.js";
import type { Side } from "../../src/board/side.js";
import type { Velocity } from "../../src/geometry/disc.js";
import { PixelPoint, squareAnchor } from "../../src/geometry/pixel-point.js";
import type { Square } from "../../src/geometry/square.js";
import { DEFAULT_RULES } from "../../src/game/game-rules.js";
import { createWorld, type World } from "../../src/game/world.js";
import type { Dice } from "../../src/random/dice.js";
import type { DrifterKind } from "../../src/sea/drifter.js";
import type { DrifterGroup } from "../../src/sea/sea-slots.js";
import { RecordingEvents } from "./game-builder.js";
import { LoadedDice } from "./loaded-dice.js";

export interface WorldUnderTest {
  readonly world: World;
  readonly events: RecordingEvents;
}

export interface WorldDice {
  readonly sea?: Dice;
  readonly fortune?: Dice;
}

/** A game's world, without its phases, for testing what happens on the sea moment by moment. */
export function aWorld(dice: WorldDice = {}): WorldUnderTest {
  const events = new RecordingEvents();
  const world = createWorld({
    options: { rounds: 3, roundSeconds: 30 },
    rules: DEFAULT_RULES,
    dice: { sea: dice.sea ?? new LoadedDice(), fortune: dice.fortune ?? new LoadedDice() },
    events,
  });
  return { world, events };
}

const GROUP_OF: Readonly<Record<DrifterKind, DrifterGroup>> = {
  rain: "weather",
  storm: "weather",
  hurricane: "weather",
  pirate: "pirates",
  fish: "fish",
};

export interface Placement {
  readonly kind: DrifterKind;
  readonly over: Square;
  readonly velocity?: Velocity;
}

/** Launches a drifter sitting exactly over a square. */
export function launchOver(world: World, placement: Placement): void {
  const at = squareAnchor(placement.over);
  const velocity = placement.velocity ?? { x: 0, y: 0 };
  world.sea.launch(GROUP_OF[placement.kind], { kind: placement.kind, at, velocity });
}

export interface Voyage {
  readonly side: Side;
  readonly boat: BoatKind;
  readonly over: Square;
}

/** Puts a governor at sea in a boat, sitting exactly over a square. */
export function sailOver(world: World, voyage: Voyage): void {
  const pilot = world.pilots[voyage.side];
  pilot.takeBoat(voyage.boat);
  pilot.lay(squareAnchor(voyage.over));
}

export function repeat(times: number, act: () => void): void {
  for (let time = 0; time < times; time += 1) act();
}

export function pointOver(square: Square): PixelPoint {
  return squareAnchor(square);
}
