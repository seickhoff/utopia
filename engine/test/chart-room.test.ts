import { describe, expect, it } from "vitest";
import { HARBOURS } from "../src/board/island-map.js";
import { NOBODY } from "../src/board/side.js";
import { Square } from "../src/geometry/square.js";
import type { SquareSnapshot } from "../src/game/game-snapshot.js";
import { watersOf } from "../src/game/waters.js";
import { ChartRoom } from "../src/sea/chart-room.js";

/** A square the snapshot lists: a boat anchored, or one going down. */
function aBoatAt(square: Square, occupant: "fishingBoat" | "wreck"): SquareSnapshot {
  return {
    row: square.row,
    col: square.col,
    terrain: "sea",
    holder: NOBODY,
    occupant,
    coastCard: 0,
    card: 0,
    wreckFrame: 0,
  };
}

describe("the chart room", () => {
  it("keeps the chart it has while the waters are unchanged", () => {
    const charts = new ChartRoom();
    const first = charts.chartOf(watersOf([]));

    expect(charts.chartOf(watersOf([aBoatAt(HARBOURS.left, "fishingBoat")]))).toBe(first);
  });

  it("draws a fresh chart once a wreck blocks the water", () => {
    const charts = new ChartRoom();
    const first = charts.chartOf(watersOf([]));

    expect(charts.chartOf(watersOf([aBoatAt(Square.at(9, 9), "wreck")]))).not.toBe(first);
  });
});
