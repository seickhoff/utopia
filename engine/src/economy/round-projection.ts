import {
  rebelMovement,
  type RebellionRules,
  type RebelMovement,
} from "../rebels/rebel-movement.js";
import type { ItemCounts } from "./item-counts.js";
import { populationChange, type PopulationChange, type PopulationRules } from "./population.js";
import { earnedPartOf, roundIncome, type IncomeRules, type RoundIncome } from "./round-income.js";
import { roundScore, type RoundScore, type ScoreRules } from "./round-score.js";

export interface EconomyRules {
  readonly income: IncomeRules;
  readonly population: PopulationRules;
  readonly score: ScoreRules;
  readonly rebellion: RebellionRules;
}

/** Where a side stands before its round is scored. */
export interface RoundInputs {
  readonly counts: ItemCounts;
  readonly population: number;
  readonly goldThisRound: number;
  /** The score of the round before, which this round's is measured against. */
  readonly lastRoundScore: number;
}

/** What the end of the round will bring, in the order the cartridge works it out. */
export interface RoundProjection {
  readonly income: RoundIncome;
  readonly population: PopulationChange;
  readonly goldEarned: number;
  readonly score: RoundScore;
  readonly rebels: RebelMovement;
}

/**
 * The one reckoning of a round's end: the real one, the advisor's forecast and the computer
 * governor's weighing of a purchase all come from here, so they can never disagree.
 */
export function projectRound(inputs: RoundInputs, rules: EconomyRules): RoundProjection {
  const income = roundIncome(inputs.counts, rules.income);
  const goldEarned = inputs.goldThisRound + earnedPartOf(income);
  const population = populationChange(inputs, rules.population);
  const score = roundScore(
    { counts: inputs.counts, population: population.after, goldThisRound: goldEarned },
    rules.score,
  );
  const trend = { previous: inputs.lastRoundScore, current: score.total };
  return { income, population, goldEarned, score, rebels: rebelMovement(trend, rules.rebellion) };
}
