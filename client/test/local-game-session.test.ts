import { newGame, type GameSnapshot } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { EventBuffer } from "../src/session/event-buffer.js";
import { LocalGameSession, NO_OPPONENT, type Opponent } from "../src/session/local-game-session.js";

function aSession(opponent: Opponent = NO_OPPONENT) {
  const events = new EventBuffer();
  const game = newGame({ options: { rounds: 3, roundSeconds: 30 }, seed: 5, events });
  game.start();
  return new LocalGameSession({ game, side: "left", events, opponent });
}

describe("LocalGameSession", () => {
  it("counts its first frame from where play starts", () => {
    const session = aSession();

    session.advanceTo(10_000);

    expect(session.frame().current.secondsLeft).toBe(30);
  });

  it("plays the time passed between frames", () => {
    const session = aSession();
    session.advanceTo(0);

    for (let ms = 250; ms <= 2000; ms += 250) session.advanceTo(ms);

    expect(session.frame().current.secondsLeft).toBe(28);
  });

  it("does not fast-forward through a long gap", () => {
    const session = aSession();
    session.advanceTo(0);

    session.advanceTo(60_000);

    expect(session.frame().current.secondsLeft).toBe(30);
  });

  it("presses keys for its own side", () => {
    const session = aSession();

    session.pressKey(9);
    session.pressKey("enter");
    session.advanceTo(0);

    expect(session.frame().current.islands.left.counts.fishingBoat).toBe(1);
  });

  it("hands over what happened since the last frame, key presses included", () => {
    const session = aSession();
    session.advanceTo(0);

    session.pressKey("enter");
    session.advanceTo(16);

    expect(session.frame().events.map((event) => event.type)).toEqual(["razzed"]);
  });

  it("hands each event over only once", () => {
    const session = aSession();
    session.advanceTo(0);
    session.pressKey("enter");
    session.advanceTo(16);

    session.advanceTo(32);

    expect(session.frame().events).toEqual([]);
  });

  it("lets the opponent see each snapshot and the time it has to play", () => {
    const turns: { snapshot: GameSnapshot; seconds: number }[] = [];
    const session = aSession({ play: (turn) => turns.push(turn) });
    session.advanceTo(0);

    session.advanceTo(100);

    expect(turns.map((turn) => turn.seconds)).toEqual([0, 0.1]);
  });
});
