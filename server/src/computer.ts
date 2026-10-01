import { Governor } from "@utopia/ai";
import { DEFAULT_RULES, SeededRandom, type Game, type Side } from "@utopia/engine";
import { ComputerSeat } from "./seats.js";

export interface Takeover {
  readonly game: Game;
  readonly side: Side;
  readonly seed: number;
}

/** The computer, at its normal strength, taking over an island's hand controller. */
export function computerSeat(takeover: Takeover): ComputerSeat {
  const { game, side, seed } = takeover;
  const governor = new Governor({
    side,
    difficulty: "normal",
    random: new SeededRandom(seed),
    rules: DEFAULT_RULES,
  });
  const controls = {
    setDisc: (reading: Parameters<Game["setDisc"]>[1]) => game.setDisc(side, reading),
    pressKey: (key: Parameters<Game["pressKey"]>[1]) => game.pressKey(side, key),
    layCursor: (point: Parameters<Game["layCursor"]>[1]) => game.layCursor(side, point),
  };
  return new ComputerSeat((turn) => governor.govern({ ...turn, controls }));
}
