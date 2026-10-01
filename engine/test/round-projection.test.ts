import { describe, expect, it } from "vitest";
import { ItemCounts } from "../src/economy/item-counts.js";
import { projectRound } from "../src/economy/round-projection.js";
import { DEFAULT_RULES } from "../src/game/game-rules.js";

const START = { population: 1000, goldThisRound: 0, lastRoundScore: 0 };

describe("projectRound", () => {
  it("scores the factory-and-school island of the round-1 screenshot at 5", () => {
    const counts = ItemCounts.of({ factory: 1, school: 1 });

    expect(projectRound({ ...START, counts }, DEFAULT_RULES.economy).score.total).toBe(5);
  });

  it("counts the round's income toward the gold earned", () => {
    const counts = ItemCounts.of({ factory: 1, school: 1 });

    const projection = projectRound({ ...START, counts, goldThisRound: 7 }, DEFAULT_RULES.economy);

    expect(projection.goldEarned).toBe(12);
  });

  it("scores against the grown population", () => {
    const counts = ItemCounts.of({ school: 1, house: 1 });

    expect(projectRound({ ...START, counts }, DEFAULT_RULES.economy).population.after).toBe(1027);
  });

  it("raises a rebel on the island that scored 5 in round 1", () => {
    const counts = ItemCounts.of({ factory: 1, school: 1 });

    expect(projectRound({ ...START, counts }, DEFAULT_RULES.economy).rebels).toBe("rise");
  });
});
