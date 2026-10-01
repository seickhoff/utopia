import { newGame, opponentOf, type GameOptions, type Side } from "@utopia/engine";
import { EventBuffer } from "./event-buffer.js";
import type { GameSession } from "./game-session.js";
import { LocalGameSession, type Opponent } from "./local-game-session.js";

/** The other island's hand controller, for whoever governs it. */
export type OpponentControls = Pick<GameSession, "setDisc" | "pressKey" | "layCursor">;
export type OpponentFactory = (controls: OpponentControls) => Opponent;

export interface LocalLaunch {
  readonly options: GameOptions;
  readonly side: Side;
  readonly seed: number;
  readonly opponent: OpponentFactory;
}

/** A solo game in the browser, started and ready to play. */
export function localGameSession(launch: LocalLaunch): LocalGameSession {
  const events = new EventBuffer();
  const game = newGame({ options: launch.options, seed: launch.seed, events });
  const rival = opponentOf(launch.side);
  const opponent = launch.opponent({
    setDisc: (reading) => game.setDisc(rival, reading),
    pressKey: (key) => game.pressKey(rival, key),
    layCursor: (point) => game.layCursor(rival, point),
  });
  game.start();
  return new LocalGameSession({ game, side: launch.side, events, opponent });
}
