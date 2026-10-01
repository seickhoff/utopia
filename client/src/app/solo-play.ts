import { opponentOf, type Side } from "@utopia/engine";
import { COMPUTER_NAME, governorName } from "@utopia/protocol";
import { cpuOpponent } from "../session/cpu-opponent.js";
import { NO_OPPONENT } from "../session/local-game-session.js";
import { localGameSession, type OpponentFactory } from "../session/local-game.js";
import type { GameSession } from "../session/game-session.js";
import type { GameSetup, OpponentChoice } from "../settings/game-setup-store.js";
import type { Match } from "./game-hud.js";

/** In a solo game the player governs the left island, as player one did on the console. */
const SOLO_SIDE: Side = "left";
/** The other island's name when no one governs it, as in the cartridge's one-player game. */
const UNCLAIMED = "UNCLAIMED";

export interface SoloGame {
  readonly session: GameSession;
  readonly match: Match;
}

/** A game in the browser against the computer, or against no one, as the player set it up. */
export function soloGame(launch: { readonly setup: GameSetup; readonly seed: number }): SoloGame {
  const { setup, seed } = launch;
  const session = localGameSession({
    options: setup,
    side: SOLO_SIDE,
    seed,
    opponent: opponentFor({ choice: setup.opponent, seed }),
  });
  return { session, match: matchFor(setup) };
}

function matchFor(setup: GameSetup): Match {
  const rival = setup.opponent === "none" ? UNCLAIMED : COMPUTER_NAME;
  const names = { [SOLO_SIDE]: governorName(setup.name), [opponentOf(SOLO_SIDE)]: rival };
  return { mine: SOLO_SIDE, names: names as Match["names"], rivalled: setup.opponent !== "none" };
}

/** Who governs the other island: no one, as in the original's solo game, or the computer. */
function opponentFor(chosen: { choice: OpponentChoice; seed: number }): OpponentFactory {
  const { choice, seed } = chosen;
  if (choice === "none") return () => NO_OPPONENT;
  return cpuOpponent({ side: opponentOf(SOLO_SIDE), difficulty: choice, seed: seed + 2 });
}
