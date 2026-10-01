import type { BoardSnapshot, ItemKind, SquareSnapshot } from "@utopia/engine";
import { DataTexture, NearestFilter, RedFormat } from "three";
import { BOARD_DEPTH, BOARD_WIDTH } from "../board/rom-space.js";

/** What covers a square's land: nothing yet, fields, lawns, paving, or packed earth. */
export type LandUse = "bare" | "field" | "lawn" | "paved" | "dirt";

/** Each land use as the byte the terrain's shader reads: its code times 50. */
export const LAND_USE_CODES: Readonly<Record<LandUse, number>> = {
  bare: 0,
  field: 50,
  lawn: 100,
  paved: 150,
  dirt: 200,
};

const LAND_USES: Readonly<Record<ItemKind, LandUse>> = {
  fort: "dirt",
  factory: "paved",
  crop: "field",
  school: "lawn",
  hospital: "lawn",
  house: "lawn",
  rebel: "dirt",
  ptBoat: "bare",
  fishingBoat: "bare",
};

/** The ground an item's district is laid on. */
export function landUseOf(item: ItemKind): LandUse {
  return LAND_USES[item];
}

/** What covers each square's land: a byte a square, row by row from the north-west. */
export function landUseMap(squares: readonly SquareSnapshot[]): Uint8Array {
  const uses = new Uint8Array(BOARD_WIDTH * BOARD_DEPTH);
  for (const square of squares) {
    if (square.occupant === "nothing" || square.occupant === "wreck") continue;
    uses[square.row * BOARD_WIDTH + square.col] = LAND_USE_CODES[landUseOf(square.occupant)];
  }
  return uses;
}

/**
 * The islands' land use as a tiny texture the terrain's shader paints from: one texel a square.
 * Rewritten only when the board changes, never every frame.
 */
export class LandUseMap {
  private readonly uses = new Uint8Array(BOARD_WIDTH * BOARD_DEPTH);
  readonly texture = new DataTexture(this.uses, BOARD_WIDTH, BOARD_DEPTH, RedFormat);
  private shownRevision = -1;

  constructor() {
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.needsUpdate = true;
  }

  update(board: BoardSnapshot): void {
    if (board.revision === this.shownRevision) return;
    this.shownRevision = board.revision;
    this.uses.set(landUseMap(board.squares));
    this.texture.needsUpdate = true;
  }
}
