import type { ItemCounts } from "./item-counts.js";

export interface IncomeRules {
  readonly goldPerFactory: number;
  readonly goldPerFishingBoat: number;
  /** Factories grow more productive with every school and hospital, up to this much a round. */
  readonly productivityCap: number;
  /** Every island's free gold each round, which does not count as earned. */
  readonly allowance: number;
}

/** The gold a side is paid at the end of a round, part by part. */
export interface RoundIncome {
  readonly factories: number;
  readonly fishingBoats: number;
  readonly productivity: number;
  readonly allowance: number;
}

export function roundIncome(counts: ItemCounts, rules: IncomeRules): RoundIncome {
  const factories = counts.count("factory");
  const hospitals = counts.count("hospital");
  const productivity = factories * (counts.count("school") + hospitals) + hospitals;
  return {
    factories: factories * rules.goldPerFactory,
    fishingBoats: counts.count("fishingBoat") * rules.goldPerFishingBoat,
    productivity: Math.min(rules.productivityCap, productivity),
    allowance: rules.allowance,
  };
}

/** The part of a round's income that counts toward the gold earned that round (the GDP). */
export function earnedPartOf(income: RoundIncome): number {
  return income.factories + income.fishingBoats + income.productivity;
}

export function totalOf(income: RoundIncome): number {
  return earnedPartOf(income) + income.allowance;
}
