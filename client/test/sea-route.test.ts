import { HARBOURS, newGame, Square, type GameEventSink } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { seaRoute } from "../src/board/sea-route.js";

const IGNORED: GameEventSink = { record: () => {} };
const squares = () => {
  const game = newGame({ options: {}, seed: 1, events: IGNORED });
  game.start();
  return game.snapshot().board.squares;
};
const isLand = (square: Square) =>
  squares().some(
    (cell) => cell.row === square.row && cell.col === square.col && cell.terrain === "land",
  );
const routeFrom = (from: Square, to: Square) => seaRoute({ squares: squares(), from, to });

describe("seaRoute", () => {
  it("sails straight across open water, one square at a time", () => {
    const route = routeFrom(Square.at(0, 0), Square.at(0, 5));

    expect(route).toEqual([1, 2, 3, 4, 5].map((col) => Square.at(0, col)));
  });

  it("goes round the islands, never over land", () => {
    const route = routeFrom(HARBOURS.left, Square.at(9, 6));

    expect([route.at(-1), route.some(isLand)]).toEqual([Square.at(9, 6), false]);
  });

  it("never cuts across the corner of land, which the sand bars would not allow", () => {
    const route = [HARBOURS.left, ...routeFrom(HARBOURS.left, Square.at(9, 6))];
    const cutCorners = route.slice(1).filter((square, index) => {
      const previous = route[index];
      const diagonal = square.row !== previous.row && square.col !== previous.col;
      return (
        diagonal &&
        (isLand(Square.at(previous.row, square.col)) || isLand(Square.at(square.row, previous.col)))
      );
    });

    expect(cutCorners).toEqual([]);
  });

  it("leads to the nearest square it can reach when the destination is land", () => {
    const route = routeFrom(HARBOURS.left, Square.at(5, 3));
    const last = route.at(-1) ?? HARBOURS.left;

    expect(Math.max(Math.abs(last.row - 5), Math.abs(last.col - 3))).toBe(1);
  });

  it("is empty when the boat is already there", () => {
    expect(routeFrom(HARBOURS.left, HARBOURS.left)).toEqual([]);
  });
});
