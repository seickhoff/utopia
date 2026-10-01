import { Governor, type DifficultyName } from "@utopia/ai";
import { DEFAULT_RULES, SeededRandom, type GameSnapshot, type Side } from "@utopia/engine";
import type { Opponent } from "./local-game-session.js";
import type { OpponentControls, OpponentFactory } from "./local-game.js";

/** The computer governing the other island, through the same hand controller a person holds. */
class CpuOpponent implements Opponent {
  constructor(
    private readonly governor: Governor,
    private readonly controls: OpponentControls,
  ) {}

  play(turn: { readonly snapshot: GameSnapshot; readonly seconds: number }): void {
    this.governor.govern({ ...turn, controls: this.controls });
  }
}

export interface CpuChoice {
  readonly side: Side;
  readonly difficulty: DifficultyName;
  readonly seed: number;
}

/** A computer governor of the chosen strength, ready to take the other island's controller. */
export function cpuOpponent(choice: CpuChoice): OpponentFactory {
  return (controls) => {
    const random = new SeededRandom(choice.seed);
    const { side, difficulty } = choice;
    return new CpuOpponent(
      new Governor({ side, difficulty, random, rules: DEFAULT_RULES }),
      controls,
    );
  };
}
