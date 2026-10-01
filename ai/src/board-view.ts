import {
  GRID_COLUMNS,
  NOBODY,
  Square,
  watersOf,
  type BoatKind,
  type Holder,
  type ItemKind,
  type Side,
  type SquareContent,
  type SquareSnapshot,
  type Waters,
} from "@utopia/engine";

/** The snapshot lists only squares that hold something; every other square is empty sea. */
const OPEN_SEA: SquareContent = {
  terrain: "sea",
  holder: NOBODY,
  occupant: "nothing",
  coastCard: 0,
};
const OFF_GRID: SquareContent = { ...OPEN_SEA, terrain: "offGrid" };
/** Rebels never spring up on rebels or forts. */
const UNWELCOMING: readonly string[] = ["rebel", "fort"];

export interface Mooring {
  readonly side: Side;
  readonly boat: BoatKind;
}

export interface Holding {
  readonly square: Square;
  readonly side: Side;
}

/** The board as a snapshot shows it, square by square. */
export class BoardView {
  private readonly held: ReadonlyMap<number, SquareContent>;
  private readonly waters: Waters;

  constructor(squares: readonly SquareSnapshot[]) {
    this.held = new Map(squares.map((square) => [square.row * GRID_COLUMNS + square.col, square]));
    this.waters = watersOf(squares);
  }

  contentAt(square: Square): SquareContent {
    if (!square.isOnGrid()) return OFF_GRID;
    return this.held.get(square.offset) ?? OPEN_SEA;
  }

  isOpenWater(square: Square): boolean {
    const { terrain, occupant } = this.contentAt(square);
    return square.isSea() && terrain === "sea" && occupant === "nothing";
  }

  /** Boats sail over anchored boats, but never onto land or a boat going down. */
  isNavigable(square: Square): boolean {
    return this.waters.isNavigable(square);
  }

  /** What the sand bars turn a boat back from: land, and a boat going down. */
  isShore(square: Square): boolean {
    return this.waters.isShore(square);
  }

  isLandOf(holding: Holding): boolean {
    const { terrain, holder } = this.contentAt(holding.square);
    return terrain === "land" && holder === holding.side;
  }

  isBuildable(holding: Holding): boolean {
    const { terrain, holder, occupant } = this.contentAt(holding.square);
    return terrain === "land" && holder === holding.side && occupant === "nothing";
  }

  holds(holding: Holding & { readonly item: ItemKind }): boolean {
    const { holder, occupant } = this.contentAt(holding.square);
    return holder === holding.side && occupant === holding.item;
  }

  /** FORT_NEAR_CARD: whose fort is found first round a square, in the cartridge's order. */
  fortNear(square: Square): Holder {
    const fort = square.neighbours().find((near) => this.contentAt(near).occupant === "fort");
    return fort === undefined ? NOBODY : this.contentAt(fort).holder;
  }

  isRebelLandingSite(square: Square): boolean {
    const unwelcoming = UNWELCOMING.includes(this.contentAt(square).occupant);
    return !unwelcoming && this.fortNear(square) === NOBODY;
  }

  anchoredBoats(mooring: Mooring): Square[] {
    return [...this.held.keys()]
      .map((offset) => Square.fromOffset(offset))
      .filter((square) => this.contentAt(square).terrain === "sea")
      .filter((square) => this.holds({ square, side: mooring.side, item: mooring.boat }));
  }
}
