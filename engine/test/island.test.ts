import { describe, expect, it } from "vitest";
import { ItemCounts } from "../src/economy/item-counts.js";
import { projectRound } from "../src/economy/round-projection.js";
import { DEFAULT_RULES } from "../src/game/game-rules.js";
import { Island } from "../src/island/island.js";

const founded = () => Island.founded({ gold: 100, population: 1000 });

describe("Island", () => {
  it("is founded with its gold and people", () => {
    expect(founded().standing()).toMatchObject({ gold: 100, population: 1000, totalScore: 0 });
  });

  it("can afford what its gold covers", () => {
    expect([founded().canAfford(100), founded().canAfford(101)]).toEqual([true, false]);
  });

  it("pays for purchases from its gold", () => {
    const island = founded();

    island.pay(35);

    expect(island.standing().gold).toBe(65);
  });

  it("counts gold earned during the round toward its GDP", () => {
    const island = founded();

    island.earn(1);

    expect(island.standing()).toMatchObject({ gold: 101, goldThisRound: 1 });
  });

  it("loses people to disasters, but never below none (ROM bug: no check)", () => {
    const island = Island.founded({ gold: 0, population: 40 });

    island.losePeople(90);

    expect(island.standing().population).toBe(0);
  });

  it("closes a round with its income, new population and score", () => {
    const island = founded();
    island.pay(75);
    const counts = ItemCounts.of({ factory: 1, school: 1 });
    const projection = projectRound(
      { counts, ...island.standing(), lastRoundScore: 0 },
      DEFAULT_RULES.economy,
    );

    island.closeRound(projection);

    expect(island.standing()).toMatchObject({
      gold: 40,
      population: 1025,
      roundScore: 5,
      totalScore: 5,
      goldThisRound: 0,
    });
  });

  it("remembers the round before when it closes the next", () => {
    const island = founded();
    const scored = (total: number) => ({ ...scoreless(), score: { ...scoreless().score, total } });
    island.closeRound(scored(18));

    island.closeRound(scored(49));

    expect(island.standing()).toMatchObject({
      previousRoundScore: 18,
      roundScore: 49,
      totalScore: 67,
    });
  });
});

function scoreless() {
  return projectRound(
    { counts: ItemCounts.NONE, population: 1000, goldThisRound: 0, lastRoundScore: 0 },
    DEFAULT_RULES.economy,
  );
}
