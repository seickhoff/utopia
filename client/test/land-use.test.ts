import { ITEM_KINDS, newGame, squareAnchor, Square, type GameEventSink } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { BOARD_DEPTH, BOARD_WIDTH } from "../src/board/rom-space.js";
import { LAND_USE_CODES, landUseMap, landUseOf } from "../src/scene/land-use.js";

const IGNORED: GameEventSink = { record: () => {} };

function boardWith(builds: readonly { square: Square; key: number }[]) {
  const game = newGame({ options: {}, seed: 1, events: IGNORED });
  game.start();
  builds.forEach(({ square, key }) => {
    game.layCursor("left", squareAnchor(square));
    game.pressKey("left", key);
    game.pressKey("left", "enter");
  });
  return game.snapshot().board;
}

describe("land use", () => {
  it("names each item's ground: fields, lawns, paving or packed earth", () => {
    expect(ITEM_KINDS.map(landUseOf)).toEqual([
      "dirt",
      "paved",
      "field",
      "lawn",
      "lawn",
      "lawn",
      "dirt",
      "bare",
      "bare",
    ]);
  });

  it("covers the whole sea, a byte a square", () => {
    expect(landUseMap(boardWith([]).squares).length).toBe(BOARD_WIDTH * BOARD_DEPTH);
  });

  it("marks every square by what stands on it, row by row", () => {
    const board = boardWith([
      { square: Square.at(3, 2), key: 3 },
      { square: Square.at(3, 3), key: 5 },
    ]);
    const uses = landUseMap(board.squares);

    expect([uses[3 * BOARD_WIDTH + 2], uses[3 * BOARD_WIDTH + 3]]).toEqual([
      LAND_USE_CODES.field,
      LAND_USE_CODES.lawn,
    ]);
  });

  it("leaves every other square bare", () => {
    const uses = landUseMap(boardWith([{ square: Square.at(3, 2), key: 3 }]).squares);

    expect(uses.reduce((sum, value) => sum + value, 0)).toBe(LAND_USE_CODES.field);
  });
});
