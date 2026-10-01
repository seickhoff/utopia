import { SeededRandom } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Pace } from "../src/pace.js";

function aPace(): Pace {
  return new Pace({ reactionSeconds: 1, keyGapSeconds: 0.4, random: new SeededRandom(7) });
}

describe("a governor's pace", () => {
  it("takes about its usual time to react, give or take a quarter", () => {
    const pace = aPace();

    const reactions = Array.from({ length: 50 }, () => pace.drawReaction());

    expect([Math.min(...reactions) >= 0.75, Math.max(...reactions) <= 1.25]).toEqual([true, true]);
  });

  it("leaves about its usual gap between keys", () => {
    const pace = aPace();

    const gaps = Array.from({ length: 50 }, () => pace.drawKeyGap());

    expect([Math.min(...gaps) >= 0.3, Math.max(...gaps) <= 0.5]).toEqual([true, true]);
  });

  it("is never quite regular", () => {
    const pace = aPace();

    expect(pace.drawReaction()).not.toBe(pace.drawReaction());
  });
});
