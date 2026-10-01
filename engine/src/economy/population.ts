import { roundedQuotient } from "./arithmetic.js";
import type { ItemCounts } from "./item-counts.js";

/** Birth and death rates are in tenths of a percent a round. */
export interface PopulationRules {
  readonly baseFertility: number;
  /** A ceiling only: schools can push fertility below zero, so births become more deaths. */
  readonly fertilityCap: number;
  readonly fertilityPerCrop: number;
  readonly fertilityPerHospital: number;
  readonly fertilityPerHouse: number;
  readonly fertilityLostPerSchool: number;
  readonly baseMortality: number;
  readonly mortalitySavedPerHospital: number;
  /** Hospitals cannot take mortality below this; factory pollution is added after it. */
  readonly mortalityFloor: number;
  readonly mortalityPerFactory: number;
  readonly cap: number;
}

export interface Populace {
  readonly population: number;
  readonly counts: ItemCounts;
}

export interface PopulationChange {
  readonly before: number;
  readonly fertility: number;
  readonly mortality: number;
  readonly births: number;
  readonly deaths: number;
  readonly after: number;
}

const RATE_SCALE = 100;
const TENTHS = 10;

export function populationChange(populace: Populace, rules: PopulationRules): PopulationChange {
  const fertility = fertilityOf(populace.counts, rules);
  const mortality = mortalityOf(populace.counts, rules);
  const tenths = roundedQuotient(populace.population, TENTHS);
  const births = roundedQuotient(tenths * fertility, RATE_SCALE);
  const deaths = roundedQuotient(tenths * mortality, RATE_SCALE);
  const after = Math.min(rules.cap, populace.population + births - deaths);
  return { before: populace.population, fertility, mortality, births, deaths, after };
}

function fertilityOf(counts: ItemCounts, rules: PopulationRules): number {
  const fertility =
    rules.baseFertility +
    rules.fertilityPerCrop * counts.count("crop") +
    rules.fertilityPerHospital * counts.count("hospital") +
    rules.fertilityPerHouse * counts.count("house") -
    rules.fertilityLostPerSchool * counts.count("school");
  return Math.min(rules.fertilityCap, fertility);
}

function mortalityOf(counts: ItemCounts, rules: PopulationRules): number {
  const cared = rules.baseMortality - rules.mortalitySavedPerHospital * counts.count("hospital");
  return (
    Math.max(rules.mortalityFloor, cared) + rules.mortalityPerFactory * counts.count("factory")
  );
}
