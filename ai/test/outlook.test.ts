import { DEFAULT_RULES, ItemCounts, projectRound, type ItemTally } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { outlookOf } from "../src/outlook.js";

const START = { population: 1000, goldThisRound: 0, lastRoundScore: 0 };
/** Two houses and two crops: a contented island of 1000 that raises no rebels. */
const CONTENTED: ItemTally = { house: 2, crop: 2 };

function outlookFor(counts: ItemTally, rounds: number) {
  return outlookOf({ start: { ...START, counts }, rounds, rules: DEFAULT_RULES });
}

describe("the outlook for the rounds ahead", () => {
  it("scores a contented island's round as the cartridge will", () => {
    const projected = projectRound(
      { ...START, counts: ItemCounts.of(CONTENTED) },
      DEFAULT_RULES.economy,
    );

    expect(outlookFor(CONTENTED, 1).points).toBe(projected.score.total);
  });

  it("adds up the scores of every round ahead", () => {
    expect(outlookFor(CONTENTED, 2).points).toBeGreaterThan(outlookFor(CONTENTED, 1).points);
  });

  it("expects crops to wither, so the food they bring dwindles round by round", () => {
    const firstRound = outlookFor(CONTENTED, 1).points;
    const secondRound = outlookFor(CONTENTED, 2).points - firstRound;

    expect(secondRound).toBeLessThan(firstRound);
  });

  it("counts a round that raises rebels as worse than its score alone", () => {
    const counts = { factory: 1, school: 1 };
    const projected = projectRound(
      { ...START, counts: ItemCounts.of(counts) },
      DEFAULT_RULES.economy,
    );

    expect(outlookFor(counts, 1).points).toBeLessThan(projected.score.total);
  });

  it("counts the gold the island earns, factories and their productivity alike", () => {
    expect(outlookFor({ factory: 1, school: 1 }, 1).gold).toBe(5);
  });

  it("leaves out the allowance every island is given anyway", () => {
    expect(outlookFor({}, 3).gold).toBe(0);
  });
});
