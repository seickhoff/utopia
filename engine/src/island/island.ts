import type { RoundProjection } from "../economy/round-projection.js";
import { totalOf } from "../economy/round-income.js";

/** Where a side's island stands: its treasury, its people and its approval ratings. */
export interface IslandStanding {
  readonly gold: number;
  readonly population: number;
  /** Gold earned this round (fishing, rain on crops, income), the island's GDP. */
  readonly goldThisRound: number;
  readonly totalScore: number;
  /** The score of the last round played (RSCO). */
  readonly roundScore: number;
  /** The score of the round before that (PRSC). */
  readonly previousRoundScore: number;
}

export interface Founding {
  readonly gold: number;
  readonly population: number;
}

const NOBODY_LEFT = 0;

export class Island {
  private constructor(private current: IslandStanding) {}

  static founded(founding: Founding): Island {
    return new Island({
      ...founding,
      goldThisRound: 0,
      totalScore: 0,
      roundScore: 0,
      previousRoundScore: 0,
    });
  }

  standing(): IslandStanding {
    return this.current;
  }

  canAfford(price: number): boolean {
    return this.current.gold >= price;
  }

  pay(price: number): void {
    this.current = { ...this.current, gold: this.current.gold - price };
  }

  /** Gold won during the round, which counts toward the round's GDP (INC_GOLD). */
  earn(gold: number): void {
    const { gold: held, goldThisRound } = this.current;
    this.current = { ...this.current, gold: held + gold, goldThisRound: goldThisRound + gold };
  }

  /** Casualties of a disaster. The cartridge never checked for fewer people than that. */
  losePeople(casualties: number): void {
    const population = Math.max(NOBODY_LEFT, this.current.population - casualties);
    this.current = { ...this.current, population };
  }

  /** Pays the round's income, grows the people and records the round's score. */
  closeRound(projection: RoundProjection): void {
    const standing = this.current;
    this.current = {
      gold: standing.gold + totalOf(projection.income),
      population: projection.population.after,
      goldThisRound: 0,
      totalScore: standing.totalScore + projection.score.total,
      roundScore: projection.score.total,
      previousRoundScore: standing.roundScore,
    };
  }
}
