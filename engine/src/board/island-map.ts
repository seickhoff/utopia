import { Square } from "../geometry/square.js";
import {
  LEFT_ISLAND_CARDS,
  LEFT_ISLAND_OFFSETS,
  RIGHT_ISLAND_CARDS,
  RIGHT_ISLAND_OFFSETS,
} from "../rom/island-tables.js";
import type { Side } from "./side.js";

/** One square of an island, and the land card it shows when nothing stands on it. */
export interface IslandSquare {
  readonly square: Square;
  readonly coastCard: number;
}

export const ISLAND_SIZE = 29;

function islandFrom(offsets: readonly number[], cards: readonly number[]): IslandSquare[] {
  return offsets.map((offset, index) => ({
    square: Square.fromOffset(offset),
    coastCard: cards[index],
  }));
}

/** Each island's squares, in the cartridge's table order (the order rebels are cleared in). */
export const ISLANDS: Readonly<Record<Side, readonly IslandSquare[]>> = {
  left: islandFrom(LEFT_ISLAND_OFFSETS, LEFT_ISLAND_CARDS),
  right: islandFrom(RIGHT_ISLAND_OFFSETS, RIGHT_ISLAND_CARDS),
};

/** The water squares where each side's new boats are launched. */
export const HARBOURS: Readonly<Record<Side, Square>> = {
  left: Square.at(6, 2),
  right: Square.at(4, 18),
};
