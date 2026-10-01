import type { Board } from "../board/board.js";
import { ISLANDS } from "../board/island-map.js";
import { NOBODY, type Side } from "../board/side.js";
import type { Square } from "../geometry/square.js";

const UNWELCOMING = ["rebel", "fort"];

/**
 * The squares of an island where a rebel band can spring up: anywhere but on rebels or forts,
 * and anywhere out of sight of a fort (a fort guards the eight squares round it).
 */
export function rebelLandingSites(board: Board, side: Side): Square[] {
  return squaresOf(side).filter(
    (square) =>
      !UNWELCOMING.includes(board.contentAt(square).occupant) && board.fortNear(square) === NOBODY,
  );
}

/** An island's rebels, in the order the cartridge disperses them. */
export function rebelsOn(board: Board, side: Side): Square[] {
  return squaresOf(side).filter((square) => board.contentAt(square).occupant === "rebel");
}

function squaresOf(side: Side): Square[] {
  return ISLANDS[side].map((land) => land.square);
}
