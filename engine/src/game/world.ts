import { Board } from "../board/board.js";
import { SIDES, type Side } from "../board/side.js";
import { PlayfieldCache } from "../collision/playfield.js";
import type { ItemCounts } from "../economy/item-counts.js";
import { PixelPoint } from "../geometry/pixel-point.js";
import { Island } from "../island/island.js";
import { Tallies } from "../island/tally.js";
import { Pilot } from "../pilots/pilot.js";
import { Selections } from "../pilots/selections.js";
import type { Dice } from "../random/dice.js";
import { SeaSlots } from "../sea/sea-slots.js";
import type { GameEventSink } from "./game-event.js";
import type { GameOptions } from "./game-options.js";
import type { GameRules } from "./game-rules.js";
import { RoundClock } from "./round-clock.js";

/** The dice a game rolls: one for the sea's comings and goings, one for fortune's turns. */
export interface GameDice {
  readonly sea: Dice;
  readonly fortune: Dice;
}

/** Everything a game is made of, shared by the use cases that play it. */
export interface World {
  readonly rules: GameRules;
  readonly board: Board;
  readonly islands: Readonly<Record<Side, Island>>;
  readonly pilots: Readonly<Record<Side, Pilot>>;
  readonly selections: Selections;
  readonly tallies: Readonly<Record<Side, Tallies>>;
  readonly sea: SeaSlots;
  readonly playfield: PlayfieldCache;
  readonly clock: RoundClock;
  readonly dice: GameDice;
  readonly events: GameEventSink;
}

export interface WorldSetup {
  readonly options: GameOptions;
  readonly rules: GameRules;
  readonly dice: GameDice;
  readonly events: GameEventSink;
}

/** Where each governor's cursor starts (PLY0_MOB_INIT, PLY1_MOB_INIT). */
export const PILOT_STARTS: Readonly<Record<Side, PixelPoint>> = {
  left: new PixelPoint(42, 78),
  right: new PixelPoint(142, 28),
};

export function createWorld(setup: WorldSetup): World {
  const { rules } = setup;
  const founding = { gold: rules.startingGold, population: rules.startingPopulation };
  const board = new Board();
  const tallyRules = { ...rules.sea.tallies, destroyAt: rules.sea.weather.destroyAt };
  return {
    rules,
    board,
    islands: bySide(() => Island.founded(founding)),
    pilots: bySide((side) => new Pilot({ start: PILOT_STARTS[side], speeds: rules.pilots })),
    selections: new Selections(),
    tallies: bySide(() => new Tallies(tallyRules)),
    sea: new SeaSlots(),
    playfield: new PlayfieldCache(board),
    clock: new RoundClock(setup.options),
    dice: setup.dice,
    events: setup.events,
  };
}

/** A side's items: those on its island and in its waters, and any boat it is sailing. */
export function countsOf(world: World, side: Side): ItemCounts {
  const counts = world.board.countsOf(side);
  const aboard = world.pilots[side].mode().aboard;
  return aboard === "none" ? counts : counts.plusOne(aboard);
}

/** One of something for each side, made in the order the cartridge serves them: left, then right. */
export function bySide<T>(make: (side: Side) => T): Record<Side, T> {
  return Object.fromEntries(SIDES.map((side) => [side, make(side)])) as Record<Side, T>;
}
