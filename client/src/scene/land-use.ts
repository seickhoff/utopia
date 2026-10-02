import type { BoardSnapshot, ItemKind, SquareSnapshot } from "@utopia/engine";
import { DataTexture, NearestFilter, RedFormat } from "three";
import { BOARD_DEPTH, BOARD_WIDTH } from "../board/rom-space.js";

/**
 * What covers a square: on land nothing yet, fields, lawns, paving, packed earth, an airfield's
 * grass, or a suburb's gardens under their trees; or the sea.
 */
export type LandUse = "bare" | "field" | "lawn" | "paved" | "dirt" | "airfield" | "suburb" | "sea";

/** How far apart the land uses' bytes lie, for the terrain's shader to tell them apart. */
export const LAND_USE_STEP = 36;

/** Each land use as the byte the terrain's shader reads: its code times LAND_USE_STEP. */
export const LAND_USE_CODES: Readonly<Record<LandUse, number>> = {
  bare: 0,
  field: LAND_USE_STEP,
  lawn: 2 * LAND_USE_STEP,
  paved: 3 * LAND_USE_STEP,
  dirt: 4 * LAND_USE_STEP,
  airfield: 5 * LAND_USE_STEP,
  suburb: 6 * LAND_USE_STEP,
  sea: 7 * LAND_USE_STEP,
};

const LAND_USES: Readonly<Record<ItemKind, LandUse>> = {
  fort: "airfield",
  factory: "paved",
  crop: "field",
  school: "lawn",
  hospital: "lawn",
  house: "suburb",
  rebel: "dirt",
  ptBoat: "bare",
  fishingBoat: "bare",
};

/** The ground an item's district is laid on. */
export function landUseOf(item: ItemKind): LandUse {
  return LAND_USES[item];
}

/**
 * What covers each square: a byte a square, row by row from the north-west. The board lists only
 * its land and whatever stands on the water, so every other square is the open sea.
 */
export function landUseMap(squares: readonly SquareSnapshot[]): Uint8Array {
  const uses = new Uint8Array(BOARD_WIDTH * BOARD_DEPTH).fill(LAND_USE_CODES.sea);
  for (const square of squares) {
    uses[square.row * BOARD_WIDTH + square.col] = LAND_USE_CODES[squareUse(square)];
  }
  return uses;
}

/** The sea, or on land whatever stands there: bare land where nothing does. */
function squareUse(square: SquareSnapshot): LandUse {
  if (square.terrain !== "land") return "sea";
  if (square.occupant === "nothing" || square.occupant === "wreck") return "bare";
  return landUseOf(square.occupant);
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
