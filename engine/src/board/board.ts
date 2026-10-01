import { ItemCounts } from "../economy/item-counts.js";
import { GRID_SQUARES, Square } from "../geometry/square.js";
import { ISLANDS, type IslandSquare } from "./island-map.js";
import { NO_WRECK, type Wreck } from "./backtab.js";
import {
  ITEM_KINDS,
  isBoat,
  type BoatKind,
  type BuildingKind,
  type ItemKind,
} from "./item-kind.js";
import { NOBODY, SIDES, type Holder, type Side } from "./side.js";
import {
  OFF_GRID,
  OPEN_SEA,
  anchoredBoat,
  emptyLand,
  type SquareContent,
} from "./square-content.js";

/** A boat to anchor, and whose it is. */
export interface Mooring {
  readonly side: Side;
  readonly boat: BoatKind;
}

interface WreckProgress {
  readonly boat: BoatKind;
  frame: number;
  count: number;
}

/** A sinking anchored boat shows the boat, then 8 frames; the last three linger (SNKFRM). */
const WRECK_FRAMES = 9;
const EARLY_FRAME_COUNTS = 6;
const LATE_FRAME_COUNTS = 19;
const FIRST_LATE_FRAME = 6;

/**
 * The playfield: both islands and the water around them, square by square. Every change bumps the
 * revision, so views and the network can tell when to look again.
 */
export class Board {
  private readonly contents: SquareContent[] = initialContents();
  private readonly wrecks = new Map<Square, WreckProgress>();
  private changes = 0;

  get revision(): number {
    return this.changes;
  }

  contentAt(square: Square): SquareContent {
    return square.isOnGrid() ? this.contents[square.offset] : OFF_GRID;
  }

  countsOf(side: Side): ItemCounts {
    const tally: Partial<Record<ItemKind, number>> = {};
    for (const content of this.contents) {
      if (content.holder !== side || !isItem(content.occupant)) continue;
      tally[content.occupant] = (tally[content.occupant] ?? 0) + 1;
    }
    return ItemCounts.of(tally);
  }

  /** FORT_NEAR_CARD: whose fort is the first found round a square, or nobody's. */
  fortNear(square: Square): Holder {
    const fort = square.neighbours().find((near) => this.contentAt(near).occupant === "fort");
    return fort === undefined ? NOBODY : this.contentAt(fort).holder;
  }

  /** The boat sinking at a square, and how far it has gone down. */
  wreckAt(square: Square): Wreck {
    const progress = this.wrecks.get(square);
    return progress === undefined ? NO_WRECK : { boat: progress.boat, frame: progress.frame };
  }

  build(square: Square, building: BuildingKind): void {
    this.put(square, { ...this.contentAt(square), occupant: building });
  }

  /** Clears an island square back to its original land. */
  raze(square: Square): void {
    this.put(square, { ...this.contentAt(square), occupant: "nothing" });
  }

  anchor(square: Square, mooring: Mooring): void {
    this.put(square, anchoredBoat(mooring.side, mooring.boat));
  }

  /** Takes an anchored boat away, as its owner sails off in it. */
  weigh(square: Square): void {
    this.put(square, OPEN_SEA);
  }

  /** Starts an anchored boat sinking; it stops counting as a boat at once. */
  wreck(square: Square): void {
    const content = this.contentAt(square);
    if (!isBoat(content.occupant)) return;
    this.wrecks.set(square, { boat: content.occupant, frame: 0, count: 0 });
    this.put(square, { ...content, occupant: "wreck" });
  }

  /** One count of every sinking animation (the cartridge counts twice a tick). */
  advanceWrecks(): void {
    for (const [square, progress] of this.wrecks) this.advanceWreck(square, progress);
  }

  private advanceWreck(square: Square, progress: WreckProgress): void {
    progress.count += 1;
    const frameCounts = progress.frame < FIRST_LATE_FRAME ? EARLY_FRAME_COUNTS : LATE_FRAME_COUNTS;
    if (progress.count < frameCounts) return;
    progress.count = 0;
    progress.frame += 1;
    this.changes += 1;
    if (progress.frame < WRECK_FRAMES) return;
    this.wrecks.delete(square);
    this.put(square, OPEN_SEA);
  }

  private put(square: Square, content: SquareContent): void {
    this.contents[square.offset] = content;
    this.changes += 1;
  }
}

function initialContents(): SquareContent[] {
  const contents: SquareContent[] = Array.from({ length: GRID_SQUARES }, () => OPEN_SEA);
  for (const side of SIDES) {
    ISLANDS[side].forEach((land: IslandSquare) => {
      contents[land.square.offset] = emptyLand(side, land.coastCard);
    });
  }
  return contents;
}

function isItem(occupant: string): occupant is ItemKind {
  return (ITEM_KINDS as readonly string[]).includes(occupant);
}
