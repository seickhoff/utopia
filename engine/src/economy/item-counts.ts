import { ITEM_KINDS, type ItemKind } from "../board/item-kind.js";

export type ItemTally = Readonly<Partial<Record<ItemKind, number>>>;

/** How many of each item a side has: what its island's income, growth and score are built on. */
export class ItemCounts {
  static readonly NONE = new ItemCounts({});

  private constructor(private readonly tally: ItemTally) {}

  static of(tally: ItemTally): ItemCounts {
    return new ItemCounts(tally);
  }

  count(kind: ItemKind): number {
    return this.tally[kind] ?? 0;
  }

  /** The same counts with one more of an item: for weighing a purchase before making it. */
  plusOne(kind: ItemKind): ItemCounts {
    return new ItemCounts({ ...this.tally, [kind]: this.count(kind) + 1 });
  }

  asTally(): Record<ItemKind, number> {
    return Object.fromEntries(ITEM_KINDS.map((kind) => [kind, this.count(kind)])) as Record<
      ItemKind,
      number
    >;
  }
}
