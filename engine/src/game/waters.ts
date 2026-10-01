import { OPEN_SEA, type SquareContent } from "../board/square-content.js";
import { GRID_COLUMNS, type Square } from "../geometry/square.js";
import { blocksVessels } from "../sea/sand-bar.js";
import type { Waters } from "../sea/sea-chart.js";
import type { SquareSnapshot } from "./game-snapshot.js";

/**
 * The waters a snapshot's board shows: a boat may sail any square of the sea that the sand bars
 * would not turn it back from. The snapshot lists only squares that hold something.
 */
export function watersOf(squares: readonly SquareSnapshot[]): Waters {
  const held = new Map<number, SquareContent>(
    squares.map((square) => [square.row * GRID_COLUMNS + square.col, square]),
  );
  const contentAt = (square: Square) => held.get(square.offset) ?? OPEN_SEA;
  return {
    isNavigable: (square) => square.isSea() && !blocksVessels(contentAt(square)),
    isShore: (square) => square.isOnGrid() && blocksVessels(contentAt(square)),
  };
}
