import { describe, expect, it } from "vitest";
import { cpuOpponent } from "../src/session/cpu-opponent.js";
import { localGameSession } from "../src/session/local-game.js";

describe("a solo game against the computer", () => {
  it("has the computer build on its own island", () => {
    const session = localGameSession({
      options: { rounds: 3, roundSeconds: 45 },
      side: "left",
      seed: 21,
      opponent: cpuOpponent({ side: "right", difficulty: "normal", seed: 23 }),
    });
    session.advanceTo(0);

    for (let ms = 16; ms < 40_000; ms += 16) session.advanceTo(ms);

    const counts = session.frame().current.islands.right.counts;
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
  });
});
