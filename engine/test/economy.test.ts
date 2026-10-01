import { describe, expect, it } from "vitest";
import { ItemCounts } from "../src/economy/item-counts.js";
import { populationChange } from "../src/economy/population.js";
import { earnedPartOf, roundIncome, totalOf } from "../src/economy/round-income.js";
import { roundScore } from "../src/economy/round-score.js";
import { DEFAULT_RULES } from "../src/game/game-rules.js";

const { income: INCOME, population: POPULATION, score: SCORE } = DEFAULT_RULES.economy;

describe("round income", () => {
  it("pays 4 gold a factory and 1 a fishing boat", () => {
    const income = roundIncome(ItemCounts.of({ factory: 2, fishingBoat: 3 }), INCOME);

    expect([income.factories, income.fishingBoats]).toEqual([8, 3]);
  });

  it("makes factories more productive with every school and hospital", () => {
    const counts = ItemCounts.of({ factory: 2, school: 1, hospital: 3 });

    expect(roundIncome(counts, INCOME).productivity).toBe(2 * (1 + 3) + 3);
  });

  it("caps the productivity bonus at 30", () => {
    const counts = ItemCounts.of({ factory: 6, school: 6 });

    expect(roundIncome(counts, INCOME).productivity).toBe(30);
  });

  it("gives everyone 10 gold that does not count as earned", () => {
    const income = roundIncome(ItemCounts.of({ factory: 1, school: 1 }), INCOME);

    expect([earnedPartOf(income), totalOf(income)]).toEqual([5, 15]);
  });
});

describe("population change", () => {
  const change = (population: number, counts: ItemCounts) =>
    populationChange({ population, counts }, POPULATION);

  it("grows by 4.0% births less 1.1% deaths on an empty island", () => {
    expect(change(1000, ItemCounts.NONE).after).toBe(1029);
  });

  it("grows a school-and-house island to 1027 (the round-1 screenshot)", () => {
    expect(change(1000, ItemCounts.of({ school: 1, house: 1 })).after).toBe(1027);
  });

  it("grows a factory-and-school island to 1025 (the round-1 screenshot)", () => {
    expect(change(1000, ItemCounts.of({ factory: 1, school: 1 })).after).toBe(1025);
  });

  it("caps fertility at 6.4%", () => {
    expect(change(1000, ItemCounts.of({ crop: 10 })).fertility).toBe(64);
  });

  it("lets schools push fertility below zero", () => {
    expect(change(1000, ItemCounts.of({ school: 15 })).births).toBe(-5);
  });

  it("stops hospitals taking mortality below 0.2%", () => {
    expect(change(1000, ItemCounts.of({ hospital: 5 })).mortality).toBe(2);
  });

  it("adds factory pollution after the hospital floor", () => {
    expect(change(1000, ItemCounts.of({ hospital: 5, factory: 3 })).mortality).toBe(5);
  });

  it("caps the population at 9999", () => {
    expect(change(9990, ItemCounts.of({ crop: 8 })).after).toBe(9999);
  });

  it("shrinks an island crowded with schools", () => {
    expect(change(1000, ItemCounts.of({ school: 29 })).after).toBe(942);
  });
});

describe("round score", () => {
  const score = (inputs: { counts: ItemCounts; population: number; goldThisRound?: number }) =>
    roundScore({ goldThisRound: 0, ...inputs }, SCORE);

  it("scores a school-and-house island of 1027 at 18 (the round-1 screenshot)", () => {
    const counts = ItemCounts.of({ school: 1, house: 1 });

    expect(score({ counts, population: 1027 }).total).toBe(18);
  });

  it("scores 5 gold earned by 1025 people at 4 for GDP (the round-1 screenshot)", () => {
    expect(score({ counts: ItemCounts.NONE, population: 1025, goldThisRound: 5 }).gdp).toBe(4);
  });

  it("caps housing at 30", () => {
    expect(score({ counts: ItemCounts.of({ house: 5 }), population: 1000 }).housing).toBe(30);
  });

  it("feeds people from crops and fishing boats alike", () => {
    const counts = ItemCounts.of({ crop: 1, fishingBoat: 1 });

    expect(score({ counts, population: 2000 }).food).toBe(17);
  });

  it("does not overflow with more than 65 food sources (ROM bug)", () => {
    expect(score({ counts: ItemCounts.of({ crop: 70 }), population: 9999 }).food).toBe(30);
  });

  it("does not wrap gold earned past 255 (ROM bug)", () => {
    expect(score({ counts: ItemCounts.NONE, population: 9999, goldThisRound: 300 }).gdp).toBe(25);
  });

  it("adds a point for every school and hospital", () => {
    const counts = ItemCounts.of({ school: 2, hospital: 3 });

    expect(score({ counts, population: 1000 }).total).toBe(5);
  });

  it("caps the round at 100", () => {
    const counts = ItemCounts.of({ house: 9, crop: 9, school: 15, hospital: 14 });

    expect(score({ counts, population: 1000, goldThisRound: 90 }).total).toBe(100);
  });

  it("scores nothing per head for fewer than 100 people, as the EXEC's divide by 0 does", () => {
    const counts = ItemCounts.of({ house: 1, school: 1 });

    expect(score({ counts, population: 99 }).total).toBe(1);
  });
});
