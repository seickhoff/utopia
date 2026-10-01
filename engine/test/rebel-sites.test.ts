import { describe, expect, it } from "vitest";
import { Board } from "../src/board/board.js";
import { ISLANDS, ISLAND_SIZE } from "../src/board/island-map.js";
import { Square } from "../src/geometry/square.js";
import { rebelLandingSites, rebelsOn } from "../src/rebels/rebel-sites.js";

describe("rebel landing sites", () => {
  it("are every square of a quiet island", () => {
    expect(rebelLandingSites(new Board(), "right")).toHaveLength(ISLAND_SIZE);
  });

  it("include squares with buildings, which rebels destroy", () => {
    const board = new Board();
    board.build(Square.at(3, 2), "hospital");

    expect(rebelLandingSites(board, "left")).toContain(Square.at(3, 2));
  });

  it("leave out squares rebels already hold", () => {
    const board = new Board();
    board.build(Square.at(3, 2), "rebel");

    expect(rebelLandingSites(board, "left")).not.toContain(Square.at(3, 2));
  });

  it("leave out a fort and the eight squares round it", () => {
    const board = new Board();
    board.build(Square.at(4, 2), "fort");

    expect(rebelLandingSites(board, "left")).toHaveLength(ISLAND_SIZE - 9);
  });

  it("are none when forts guard the whole island", () => {
    const board = new Board();
    const forts = [
      [3, 2],
      [5, 2],
      [6, 4],
      [8, 4],
      [7, 7],
      [8, 10],
    ];
    for (const [row, col] of forts) board.build(Square.at(row, col), "fort");

    expect(rebelLandingSites(board, "left")).toEqual([]);
  });
});

describe("rebelsOn", () => {
  it("lists an island's rebels in the cartridge's table order", () => {
    const board = new Board();
    const [first, , third] = ISLANDS.right.map((land) => land.square);
    board.build(third, "rebel");
    board.build(first, "rebel");

    expect(rebelsOn(board, "right")).toEqual([first, third]);
  });
});
