import { newGame, type GameSnapshot } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import {
  COMPUTER_NAME,
  INVALID,
  NAME_LENGTH,
  NO_BOARD_SENT,
  encode,
  fromWire,
  governorName,
  readClientMessage,
  readServerMessage,
  toWire,
} from "../src/index.js";

function aSnapshot(): GameSnapshot {
  const game = newGame({ options: {}, seed: 7, events: { record: () => {} } });
  game.start();
  return game.snapshot();
}

describe("governorName", () => {
  it("writes a name in the capitals the cartridge's letters can print", () => {
    expect(governorName("  ada   lovelace! ")).toBe("ADA LOVEL");
  });

  it("keeps a name to what fits over an island", () => {
    expect(governorName("x".repeat(40)).length).toBe(NAME_LENGTH);
  });

  it("names a governor who gave no name", () => {
    expect(governorName("?!")).toBe("GOVERNOR");
  });

  it("names the computer plainly, so a player knows who governs the other island", () => {
    expect(COMPUTER_NAME).toBe("COMPUTER");
  });
});

describe("readClientMessage", () => {
  const read = (message: unknown) => readClientMessage(JSON.stringify(message));

  it("reads a request to host, cleaning the name and the options", () => {
    expect(read({ type: "host", name: "ada", options: { rounds: 99, roundSeconds: 60 } })).toEqual({
      type: "host",
      name: "ADA",
      options: { rounds: 50, roundSeconds: 60 },
    });
  });

  it("reads a request to join a room by its code", () => {
    expect(read({ type: "join", room: "QZXK", name: "Grace" })).toEqual({
      type: "join",
      room: "QZXK",
      name: "GRACE",
    });
  });

  it("reads the hand controller: the disc, a key, and the cursor laid on a point", () => {
    const messages = [
      { type: "disc", reading: 12 },
      { type: "disc", reading: "released" },
      { type: "key", key: "enter" },
      { type: "key", key: 7 },
      { type: "lay", x: 42, y: 78 },
    ];

    expect(messages.map(read)).toEqual(messages);
  });

  it("refuses a disc direction the controller has not got", () => {
    expect([read({ type: "disc", reading: 16 }), read({ type: "disc", reading: 2.5 })]).toEqual([
      INVALID,
      INVALID,
    ]);
  });

  it("refuses a key the keypad has not got", () => {
    expect([read({ type: "key", key: 10 }), read({ type: "key", key: "fire" })]).toEqual([
      INVALID,
      INVALID,
    ]);
  });

  it("refuses a malformed room code", () => {
    expect(read({ type: "join", room: "qz", name: "x" })).toBe(INVALID);
  });

  it("refuses what is not one of its messages", () => {
    expect([read({ type: "constructor" }), read([1, 2]), readClientMessage("{nope")]).toEqual([
      INVALID,
      INVALID,
      INVALID,
    ]);
  });

  it("refuses a message far longer than any it sends", () => {
    expect(readClientMessage(`{"type":"leave","pad":"${"x".repeat(5000)}"}`)).toBe(INVALID);
  });

  it("reads the choice made when a rival leaves", () => {
    expect(read({ type: "carryOn", choice: "computer" })).toEqual({
      type: "carryOn",
      choice: "computer",
    });
  });
});

describe("readServerMessage", () => {
  it("reads what the server sends back as it was sent", () => {
    const message = { type: "paused", absent: "right" } as const;

    expect(readServerMessage(encode(message))).toEqual(message);
  });

  it("refuses a message the server never sends", () => {
    expect(readServerMessage(JSON.stringify({ type: "launchMissiles" }))).toBe(INVALID);
  });

  it("refuses a frame without a snapshot", () => {
    expect(readServerMessage(JSON.stringify({ type: "frame", events: [] }))).toBe(INVALID);
  });
});

describe("toWire and fromWire", () => {
  it("leaves the board out once the player has it", () => {
    const snapshot = aSnapshot();

    expect(toWire(snapshot, snapshot.board.revision).board).toBe("unchanged");
  });

  it("sends the board whenever it has changed, or has never been sent", () => {
    expect(toWire(aSnapshot(), NO_BOARD_SENT).board).toEqual(aSnapshot().board);
  });

  it("puts back the board the player already has", () => {
    const snapshot = aSnapshot();
    const wire = toWire(snapshot, snapshot.board.revision);

    expect(fromWire(wire, snapshot.board)).toEqual(snapshot);
  });
});
