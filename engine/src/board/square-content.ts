import type { BoatKind, ItemKind } from "./item-kind.js";
import { NOBODY, type Holder, type Side } from "./side.js";

export type Terrain = "sea" | "land" | "offGrid";
/** What stands on a square: an item, a sinking boat, or nothing. */
export type Occupant = ItemKind | "wreck" | "nothing";

/** What one square of the board holds: a plain record, like the cartridge's BACKTAB word. */
export interface SquareContent {
  readonly terrain: Terrain;
  /** Whose island the land is, or whose boat is anchored or sinking there. */
  readonly holder: Holder;
  readonly occupant: Occupant;
  /** The land card an island square shows when empty; 0 (solid) off the islands. */
  readonly coastCard: number;
}

export const OPEN_SEA: SquareContent = {
  terrain: "sea",
  holder: NOBODY,
  occupant: "nothing",
  coastCard: 0,
};

/** Everything beyond the grid reads as open sea that can hold nothing. */
export const OFF_GRID: SquareContent = { ...OPEN_SEA, terrain: "offGrid" };

export function emptyLand(side: Side, coastCard: number): SquareContent {
  return { terrain: "land", holder: side, occupant: "nothing", coastCard };
}

export function anchoredBoat(side: Side, boat: BoatKind): SquareContent {
  return { terrain: "sea", holder: side, occupant: boat, coastCard: 0 };
}

export function isOccupied(content: SquareContent): boolean {
  return content.occupant !== "nothing";
}

export function isOpenWater(content: SquareContent): boolean {
  return content.terrain === "sea" && !isOccupied(content);
}

export function isItem(occupant: Occupant): occupant is ItemKind {
  return occupant !== "wreck" && occupant !== "nothing";
}
