import { describe, expect, it } from "vitest";
import { Board } from "../src/board/board.js";
import { HARBOURS, ISLANDS, ISLAND_SIZE } from "../src/board/island-map.js";
import { OFF_GRID, OPEN_SEA } from "../src/board/square-content.js";
import { Square } from "../src/geometry/square.js";

const LEFT_LAND = ISLANDS.left[0].square;
const LEFT_COAST = ISLANDS.left[0].coastCard;

describe("the islands", () => {
  it("each have 29 squares", () => {
    expect([ISLANDS.left.length, ISLANDS.right.length]).toEqual([ISLAND_SIZE, ISLAND_SIZE]);
  });

  it("start the game as empty land of their own side", () => {
    const board = new Board();

    expect(board.contentAt(Square.at(3, 2))).toEqual({
      terrain: "land",
      holder: "left",
      occupant: "nothing",
      coastCard: 0,
    });
  });

  it("have harbours in open water", () => {
    const board = new Board();

    expect([board.contentAt(HARBOURS.left), board.contentAt(HARBOURS.right)]).toEqual([
      OPEN_SEA,
      OPEN_SEA,
    ]);
  });
});

describe("Board", () => {
  it("reads beyond the grid as off-grid water", () => {
    expect(new Board().contentAt(Square.fromOffset(-1))).toBe(OFF_GRID);
  });

  it("builds on a square", () => {
    const board = new Board();

    board.build(LEFT_LAND, "school");

    expect(board.contentAt(LEFT_LAND).occupant).toBe("school");
  });

  it("razes a square back to its original coastline", () => {
    const board = new Board();
    board.build(LEFT_LAND, "house");

    board.raze(LEFT_LAND);

    expect(board.contentAt(LEFT_LAND)).toMatchObject({
      occupant: "nothing",
      coastCard: LEFT_COAST,
    });
  });

  it("counts a side's buildings and anchored boats", () => {
    const board = new Board();
    board.build(ISLANDS.left[0].square, "crop");
    board.build(ISLANDS.left[1].square, "crop");
    board.anchor(Square.at(9, 9), { side: "left", boat: "fishingBoat" });
    board.anchor(Square.at(9, 10), { side: "right", boat: "fishingBoat" });

    expect(board.countsOf("left").asTally()).toMatchObject({ crop: 2, fishingBoat: 1 });
  });

  it("finds the first fort round a square, east before west", () => {
    const board = new Board();
    board.build(Square.at(5, 3), "fort");
    board.build(Square.at(5, 1), "fort");

    expect(board.fortNear(Square.at(5, 2))).toBe("left");
  });

  it("finds no fort when none is next to the square", () => {
    const board = new Board();
    board.build(Square.at(3, 1), "fort");

    expect(board.fortNear(Square.at(5, 3))).toBe("nobody");
  });

  it("weighs anchor, leaving open water", () => {
    const board = new Board();
    board.anchor(Square.at(9, 9), { side: "left", boat: "ptBoat" });

    board.weigh(Square.at(9, 9));

    expect(board.contentAt(Square.at(9, 9))).toBe(OPEN_SEA);
  });

  it("marks every change with a new revision", () => {
    const board = new Board();
    const before = board.revision;

    board.build(LEFT_LAND, "fort");

    expect(board.revision).toBe(before + 1);
  });
});

describe("a wreck", () => {
  const wreckAt = (square: Square) => {
    const board = new Board();
    board.anchor(square, { side: "right", boat: "fishingBoat" });
    board.wreck(square);
    return board;
  };
  const advance = (board: Board, counts: number) => {
    for (let count = 0; count < counts; count += 1) board.advanceWrecks();
  };

  it("stops counting as a boat at once", () => {
    expect(wreckAt(Square.at(9, 9)).countsOf("right").count("fishingBoat")).toBe(0);
  });

  it("remembers which boat it was", () => {
    expect(wreckAt(Square.at(9, 9)).wreckAt(Square.at(9, 9)).boat).toBe("fishingBoat");
  });

  it("shows the boat until its first frame", () => {
    const board = wreckAt(Square.at(9, 9));
    advance(board, 5);

    expect(board.wreckAt(Square.at(9, 9)).frame).toBe(0);
  });

  it("steps through its frames six counts apiece at first", () => {
    const board = wreckAt(Square.at(9, 9));
    advance(board, 12);

    expect(board.wreckAt(Square.at(9, 9)).frame).toBe(2);
  });

  it("slows to nineteen counts a frame at the end", () => {
    const board = wreckAt(Square.at(9, 9));
    advance(board, 36 + 19);

    expect(board.wreckAt(Square.at(9, 9)).frame).toBe(7);
  });

  it("goes under after 93 counts", () => {
    const board = wreckAt(Square.at(9, 9));
    advance(board, 93);

    expect(board.contentAt(Square.at(9, 9))).toBe(OPEN_SEA);
  });

  it("sinks alongside another (ROM bug: one at a time)", () => {
    const board = wreckAt(Square.at(9, 9));
    board.anchor(Square.at(9, 12), { side: "left", boat: "ptBoat" });
    board.wreck(Square.at(9, 12));
    advance(board, 12);

    expect(board.wreckAt(Square.at(9, 12)).frame).toBe(2);
  });
});
