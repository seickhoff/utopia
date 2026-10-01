import { PixelPoint, newGame, type GameEvent, type GameSnapshot } from "@utopia/engine";
import { NO_BOARD_SENT, toWire, type ClientMessage } from "@utopia/protocol";
import { describe, expect, it } from "vitest";
import { RemoteGameSession } from "../src/session/remote-game-session.js";

const FRAME_MS = 50;

/** A game running as the server would run it, to take snapshots from. */
function aServerGame() {
  const game = newGame({ options: {}, seed: 3, events: { record: () => {} } });
  game.start();
  return game;
}

/** A remote session on the left island, and what it has sent the server. */
function aSession(first: GameSnapshot) {
  const sent: ClientMessage[] = [];
  const clock = { ms: 0 };
  const session = new RemoteGameSession({
    side: "left",
    first: toWire(first, NO_BOARD_SENT),
    send: (message) => sent.push(message),
    clock: () => clock.ms,
  });
  return { session, sent, clock };
}

/** The same snapshot, with the left governor's cursor moved. */
function withCursorAt(snapshot: GameSnapshot, at: { x: number; y: number }): GameSnapshot {
  const left = snapshot.islands.left;
  return {
    ...snapshot,
    islands: { ...snapshot.islands, left: { ...left, pilot: { ...left.pilot, ...at } } },
  };
}

describe("RemoteGameSession", () => {
  it("shows the server's game from its first frame", () => {
    const snapshot = aServerGame().snapshot();

    expect(aSession(snapshot).session.frame().current).toEqual(snapshot);
  });

  it("keeps the board it has when a frame leaves it out", () => {
    const game = aServerGame();
    const first = game.snapshot();
    const { session } = aSession(first);
    game.advance(0.05);

    session.receiveFrame({ snapshot: toWire(game.snapshot(), first.board.revision), events: [] });
    session.advanceTo(FRAME_MS);

    expect(session.frame().current.board).toEqual(first.board);
  });

  it("sends the player's hand controller to the server", () => {
    const { session, sent } = aSession(aServerGame().snapshot());

    session.setDisc(4);
    session.pressKey("enter");
    session.layCursor(new PixelPoint(42, 78));

    expect(sent).toEqual([
      { type: "disc", reading: 4 },
      { type: "key", key: "enter" },
      { type: "lay", x: 42, y: 78 },
    ]);
  });

  it("sends a disc reading only when it changes", () => {
    const { session, sent } = aSession(aServerGame().snapshot());

    session.setDisc(4);
    session.setDisc(4);

    expect(sent).toHaveLength(1);
  });

  it("moves things smoothly between the server's frames", () => {
    const first = withCursorAt(aServerGame().snapshot(), { x: 40, y: 60 });
    const { session, clock } = aSession(first);
    const next = withCursorAt(first, { x: 46, y: 60 });

    session.receiveFrame({ snapshot: toWire(next, first.board.revision), events: [] });
    clock.ms = FRAME_MS / 2;
    session.advanceTo(clock.ms);

    expect(session.frame().current.islands.left.pilot.x).toBe(43);
  });

  it("hands over a frame's events once", () => {
    const first = aServerGame().snapshot();
    const { session } = aSession(first);
    const roundStarted: GameEvent = { type: "roundStarted", round: 2 };

    session.receiveFrame({ snapshot: toWire(first, first.board.revision), events: [roundStarted] });
    session.advanceTo(FRAME_MS);
    const once = session.frame().events;
    session.advanceTo(FRAME_MS * 2);

    expect([once, session.frame().events]).toEqual([[roundStarted], []]);
  });

  it("puts the player's cursor where they laid it at once, not a round trip later", () => {
    const { session } = aSession(aServerGame().snapshot());

    session.layCursor(new PixelPoint(90, 30));
    session.advanceTo(1);

    const { x, y } = session.frame().current.islands.left.pilot;
    expect([x, y]).toEqual([90, 30]);
  });

  it("leaves pausing to the server", () => {
    expect(aSession(aServerGame().snapshot()).session.pausable).toBe(false);
  });
});
