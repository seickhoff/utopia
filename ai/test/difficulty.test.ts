import { describe, expect, it } from "vitest";
import { DIFFICULTIES, PLAYING_STRENGTHS } from "../src/difficulty.js";

const [EASY, NORMAL, HARD] = DIFFICULTIES.map((name) => PLAYING_STRENGTHS[name]);

describe("the difficulties", () => {
  it("run from easy through normal to hard", () => {
    expect(DIFFICULTIES).toEqual(["easy", "normal", "hard"]);
  });

  it("react faster the harder they are", () => {
    expect([
      EASY.reactionSeconds > NORMAL.reactionSeconds,
      NORMAL.reactionSeconds > HARD.reactionSeconds,
    ]).toEqual([true, true]);
  });

  it("key in orders faster the harder they are", () => {
    expect([
      EASY.keyGapSeconds > NORMAL.keyGapSeconds,
      NORMAL.keyGapSeconds > HARD.keyGapSeconds,
    ]).toEqual([true, true]);
  });

  it("look further ahead the harder they are", () => {
    expect([
      EASY.horizonRounds < NORMAL.horizonRounds,
      NORMAL.horizonRounds < HARD.horizonRounds,
    ]).toEqual([true, true]);
  });

  it("blunder less the harder they are, and hard not at all", () => {
    expect([EASY.mistakeChance > NORMAL.mistakeChance, HARD.mistakeChance]).toEqual([true, 0]);
  });
});
