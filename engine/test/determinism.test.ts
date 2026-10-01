import { describe, expect, it } from "vitest";
import { newGame } from "../src/match/game-setup.js";
import { RecordingEvents } from "./support/game-builder.js";

function playedFromSeed(seed: number) {
  const events = new RecordingEvents();
  const game = newGame({ options: { rounds: 2, roundSeconds: 30 }, seed, events });
  game.start();
  game.pressKey("left", 9);
  game.pressKey("left", "enter");
  game.setDisc("right", 10);
  game.advance(40);
  return { snapshot: game.snapshot(), events: events.all };
}

describe("a game from a seed", () => {
  it("plays out the same every time, so the server and a browser agree", () => {
    expect(playedFromSeed(20260926)).toEqual(playedFromSeed(20260926));
  });

  it("plays out differently from another seed", () => {
    expect(playedFromSeed(1).snapshot.sprites).not.toEqual(playedFromSeed(2).snapshot.sprites);
  });
});
