import { sanitizeGameOptions, type GameOptions } from "../game/game-options.js";
import type { GameEventSink } from "../game/game-event.js";
import { DEFAULT_RULES, type GameRules } from "../game/game-rules.js";
import { Game } from "../game/game.js";
import { FairDice } from "../random/dice.js";
import { SeededRandom } from "../random/random-source.js";

/** What it takes to set up a game: the chosen options, a seed, and somewhere to tell events. */
export interface GameLaunch {
  readonly options: Partial<GameOptions>;
  readonly seed: number;
  readonly events: GameEventSink;
  readonly rules?: GameRules;
}

/** A new game, not yet started, whose every roll follows from its seed. */
export function newGame(launch: GameLaunch): Game {
  const setup = {
    options: sanitizeGameOptions(launch.options),
    rules: launch.rules ?? DEFAULT_RULES,
  };
  return new Game(setup, {
    sea: new FairDice(new SeededRandom(launch.seed)),
    fortune: new FairDice(new SeededRandom(launch.seed + 1)),
    events: launch.events,
  });
}
