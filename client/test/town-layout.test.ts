import { newGame, squareAnchor, Square, type GameEventSink } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { FOOTING, type GroundReading } from "../src/scene/ground-fit.js";
import { townTriangles } from "../src/scene/town-layout.js";

const IGNORED: GameEventSink = { record: () => {} };
const FLAT: GroundReading = { heightAt: () => 0.2, shoreDistanceAt: () => 5 };

function boardAfter(moves: (game: ReturnType<typeof newGame>) => void) {
  const game = newGame({ options: {}, seed: 1, events: IGNORED });
  game.start();
  moves(game);
  return game.snapshot().board;
}

describe("townTriangles", () => {
  it("leaves the islands bare at the start of a game", () => {
    const board = boardAfter(() => {});

    expect(townTriangles({ squares: board.squares, ground: FLAT }).positions).toEqual([]);
  });

  it("builds a district on a square, its buildings sunk a little into the ground", () => {
    const board = boardAfter((game) => {
      game.layCursor("left", squareAnchor(Square.at(3, 2)));
      game.pressKey("left", 6);
      game.pressKey("left", "enter");
    });
    const onlyHouse = board.squares.filter((square) => square.occupant === "house");

    const { positions } = townTriangles({ squares: onlyHouse, ground: FLAT });
    const heights = positions.filter((_, index) => index % 3 === 1);

    expect([Math.min(...heights), Math.max(...heights) > 0.35]).toEqual([0.2 - FOOTING, true]);
  });

  it("leaves a planted square to the terrain, which paints its field", () => {
    const board = boardAfter((game) => {
      game.layCursor("left", squareAnchor(Square.at(3, 2)));
      game.pressKey("left", 3);
      game.pressKey("left", "enter");
    });
    const onlyCrop = board.squares.filter((square) => square.occupant === "crop");

    expect([onlyCrop.length, townTriangles({ squares: onlyCrop, ground: FLAT }).positions]).toEqual(
      [1, []],
    );
  });

  it("stays within a sensible triangle budget with the islands crowded", () => {
    const board = boardAfter(() => {});

    expect(
      townTriangles({ squares: board.squares, ground: FLAT }).positions.length / 9,
    ).toBeLessThan(6000);
  });
});
