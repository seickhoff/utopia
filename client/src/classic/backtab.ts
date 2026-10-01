import {
  BLANK_CARD,
  CARD_PICTURES,
  COLOURS,
  GRID_COLUMNS,
  GRID_ROWS,
  bitRows,
  colourOf,
  isBoat,
  type GameSnapshot,
  type SquareSnapshot,
} from "@utopia/engine";
import { SIDE_COLOURS } from "../art/palette.js";

/** One card of the screen: its picture's rows and the two colours it is drawn in. */
export interface CardCell {
  readonly rows: readonly number[];
  readonly foreground: number;
  readonly background: number;
}

const CARD_ROWS = CARD_PICTURES.map(bitRows);
const NO_PIXELS: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0];
const WATER: CardCell = { rows: NO_PIXELS, foreground: COLOURS.blue, background: COLOURS.blue };

/**
 * The screen's 20 x 12 cards as the cartridge shows them. Land is tan on blue water; a built
 * square is its item's colour on tan (the colour stack's trick); boats are their side's colour.
 */
export function composeBacktab(snapshot: GameSnapshot): CardCell[] {
  const cells: CardCell[] = new Array<CardCell>(GRID_COLUMNS * GRID_ROWS).fill(WATER);
  for (const square of snapshot.board.squares) {
    cells[square.row * GRID_COLUMNS + square.col] = cellOf(square);
  }
  return cells;
}

function cellOf(square: SquareSnapshot): CardCell {
  const rows = square.card === BLANK_CARD ? NO_PIXELS : CARD_ROWS[square.card];
  return { rows, foreground: foregroundOf(square), background: backgroundOf(square) };
}

function foregroundOf(square: SquareSnapshot): number {
  const { terrain, occupant, holder } = square;
  if (terrain === "land") return occupant === "nothing" ? COLOURS.tan : itemColour(square);
  return holder === "nobody" ? COLOURS.blue : SIDE_COLOURS[holder];
}

function itemColour(square: SquareSnapshot): number {
  const { occupant } = square;
  return occupant === "wreck" || occupant === "nothing" || isBoat(occupant)
    ? COLOURS.black
    : colourOf(occupant);
}

function backgroundOf(square: SquareSnapshot): number {
  return square.terrain === "land" && square.occupant !== "nothing" ? COLOURS.tan : COLOURS.blue;
}
