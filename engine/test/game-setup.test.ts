import { describe, expect, it } from "vitest";
import { sanitizeGameOptions } from "../src/game/game-options.js";
import { newGame } from "../src/match/game-setup.js";
import { RecordingEvents } from "./support/game-builder.js";

describe("newGame", () => {
  it("waits to be started", () => {
    const game = newGame({ options: {}, seed: 1, events: new RecordingEvents() });

    expect(game.snapshot().phase).toBe("ready");
  });

  it("plays the options it was given", () => {
    const game = newGame({
      options: { rounds: 7, roundSeconds: 60 },
      seed: 1,
      events: new RecordingEvents(),
    });

    expect([game.snapshot().rounds, game.snapshot().secondsLeft]).toEqual([7, 60]);
  });
});

describe("sanitizeGameOptions", () => {
  it("keeps a term within 1 to 50 rounds", () => {
    expect([
      sanitizeGameOptions({ rounds: 0 }).rounds,
      sanitizeGameOptions({ rounds: 99 }).rounds,
    ]).toEqual([1, 50]);
  });

  it("keeps a turn within 30 to 120 seconds", () => {
    const turn = (roundSeconds: number) => sanitizeGameOptions({ roundSeconds }).roundSeconds;

    expect([turn(10), turn(500), turn(44.6)]).toEqual([30, 120, 45]);
  });

  it("fills in the manual's advice where nothing was chosen", () => {
    expect(sanitizeGameOptions({})).toEqual({ rounds: 10, roundSeconds: 45 });
  });
});
