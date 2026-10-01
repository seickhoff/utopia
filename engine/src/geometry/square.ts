/** The screen is a grid of 8x8 cards (BACKTAB): 20 across, 12 down, the last row the status bar. */
export const GRID_COLUMNS = 20;
export const GRID_ROWS = 12;
export const STATUS_ROW = GRID_ROWS - 1;
export const GRID_SQUARES = GRID_COLUMNS * GRID_ROWS;
export const CARD_PIXELS = 8;

/**
 * The eight squares around one, in the order the cartridge looks for forts: east, south-west,
 * south, south-east, then west, north-east, north, north-west. The first fort found decides.
 */
export const NEIGHBOUR_OFFSETS: readonly number[] = [1, 19, 20, 21, -1, -19, -20, -21];

/** One card of the grid, named by its offset as the cartridge does (row × 20 + column). */
export class Square {
  private static readonly squares = new Map<number, Square>();

  private constructor(readonly offset: number) {}

  static fromOffset(offset: number): Square {
    const known = Square.squares.get(offset);
    if (known !== undefined) return known;
    const square = new Square(offset);
    Square.squares.set(offset, square);
    return square;
  }

  static at(row: number, col: number): Square {
    return Square.fromOffset(row * GRID_COLUMNS + col);
  }

  get row(): number {
    return Math.floor(this.offset / GRID_COLUMNS);
  }

  get col(): number {
    return this.offset - this.row * GRID_COLUMNS;
  }

  isOnGrid(): boolean {
    return this.offset >= 0 && this.offset < GRID_SQUARES;
  }

  /** Open water or island: every row but the status bar. */
  isSea(): boolean {
    return this.isOnGrid() && this.row < STATUS_ROW;
  }

  /** The square a number of cards on, wrapping from row to row as the cartridge's pointers do. */
  shiftedBy(offset: number): Square {
    return Square.fromOffset(this.offset + offset);
  }

  neighbours(): Square[] {
    return NEIGHBOUR_OFFSETS.map((offset) => this.shiftedBy(offset));
  }
}
