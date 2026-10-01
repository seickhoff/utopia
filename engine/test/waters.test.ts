import { describe, expect, it } from "vitest";
import { HARBOURS, ISLANDS } from "../src/board/island-map.js";
import { NOBODY } from "../src/board/side.js";
import { Square, STATUS_ROW } from "../src/geometry/square.js";
import type { SquareSnapshot } from "../src/game/game-snapshot.js";
import { watersOf } from "../src/game/waters.js";
import { aGame } from "./support/game-builder.js";

const LAND = ISLANDS.left[0].square;
const OPEN_WATER = Square.at(0, 0);

const watersOfAGame = () => watersOf(aGame().started().snapshot().board.squares);

/** A square the snapshot lists: here, a boat going down. */
function aWreckAt(square: Square): SquareSnapshot {
  return {
    row: square.row,
    col: square.col,
    terrain: "sea",
    holder: NOBODY,
    occupant: "wreck",
    coastCard: 0,
    card: 0,
    wreckFrame: 1,
  };
}

describe("the waters of a snapshot", () => {
  it("lets a boat sail open water", () => {
    expect(watersOfAGame().isNavigable(OPEN_WATER)).toBe(true);
  });

  it("lets a boat sail over an anchored boat", () => {
    const game = aGame().started().buy("left", "fishingBoat");

    expect(watersOf(game.snapshot().board.squares).isNavigable(HARBOURS.left)).toBe(true);
  });

  it("keeps a boat off land", () => {
    expect(watersOfAGame().isNavigable(LAND)).toBe(false);
  });

  it("keeps a boat out of the status row", () => {
    expect(watersOfAGame().isNavigable(Square.at(STATUS_ROW, 3))).toBe(false);
  });

  it("counts land as the shore the sand bars turn a boat back from", () => {
    expect([watersOfAGame().isShore(LAND), watersOfAGame().isShore(OPEN_WATER)]).toEqual([
      true,
      false,
    ]);
  });

  it("counts a boat going down as shore, and keeps other boats off it", () => {
    const wreck = Square.at(9, 9);
    const waters = watersOf([aWreckAt(wreck)]);

    expect([waters.isShore(wreck), waters.isNavigable(wreck)]).toEqual([true, false]);
  });
});
