import { roundedQuotient, truncatedQuotient } from "./arithmetic.js";
import type { ItemCounts } from "./item-counts.js";

/** How a round's "approval rating" is worked out from what an island has per head. */
export interface ScoreRules {
  readonly peoplePerHouse: number;
  readonly housingDivisor: number;
  readonly gdpScale: number;
  readonly gdpDivisor: number;
  readonly peoplePerFoodSource: number;
  readonly foodDivisor: number;
  /** Housing, GDP and food each score at most this much. */
  readonly partCap: number;
  readonly roundCap: number;
}

export interface ScoreInputs {
  readonly counts: ItemCounts;
  readonly population: number;
  readonly goldThisRound: number;
}

export interface RoundScore {
  readonly housing: number;
  readonly gdp: number;
  readonly food: number;
  readonly schools: number;
  readonly hospitals: number;
  readonly total: number;
}

const PER_HUNDRED = 100;

export function roundScore(inputs: ScoreInputs, rules: ScoreRules): RoundScore {
  const perCapita = perCapitaScorer(inputs.population, rules.partCap);
  const counts = inputs.counts;
  const housing = perCapita(counts.count("house") * rules.peoplePerHouse, rules.housingDivisor);
  const gdp = perCapita(inputs.goldThisRound * rules.gdpScale, rules.gdpDivisor);
  const foodSources = counts.count("fishingBoat") + counts.count("crop");
  const food = perCapita(foodSources * rules.peoplePerFoodSource, rules.foodDivisor);
  const schools = counts.count("school");
  const hospitals = counts.count("hospital");
  const total = Math.min(rules.roundCap, housing + gdp + food + schools + hospitals);
  return { housing, gdp, food, schools, hospitals, total };
}

/** Scores an amount per hundred people; with fewer than 100 people the EXEC divides by 0 → 0. */
function perCapitaScorer(population: number, cap: number) {
  const hundreds = truncatedQuotient(population, PER_HUNDRED);
  return (amount: number, divisor: number) =>
    Math.min(cap, roundedQuotient(roundedQuotient(amount, hundreds), divisor));
}
