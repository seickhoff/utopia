import { Square } from "../geometry/square.js";

/** A square as plain data, the form it takes in events and snapshots. */
export interface Cell {
  readonly row: number;
  readonly col: number;
}

export function cellOf(square: Square): Cell {
  return { row: square.row, col: square.col };
}

export function squareOf(cell: Cell): Square {
  return Square.at(cell.row, cell.col);
}
