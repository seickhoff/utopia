import { ITEM_COLOURS, ITEM_PRICES } from "../rom/item-tables.js";

/** Everything a governor can buy, in keypad order: item N is bought with key N. */
export const ITEM_KINDS = [
  "fort",
  "factory",
  "crop",
  "school",
  "hospital",
  "house",
  "rebel",
  "ptBoat",
  "fishingBoat",
] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];
export type BoatKind = "ptBoat" | "fishingBoat";
/** What can stand on an island square. */
export type BuildingKind = Exclude<ItemKind, BoatKind>;

const FIRST_KEY = 1;

export function itemOnKey(key: number): ItemKind {
  const kind = ITEM_KINDS[key - FIRST_KEY];
  if (kind === undefined) throw new RangeError(`No item is bought with key ${key}`);
  return kind;
}

export function keyOf(kind: ItemKind): number {
  return ITEM_KINDS.indexOf(kind) + FIRST_KEY;
}

export function priceOf(kind: ItemKind): number {
  return ITEM_PRICES[ITEM_KINDS.indexOf(kind)];
}

/** Palette colour an item is drawn in; boats are drawn in their side's colour instead. */
export function colourOf(kind: ItemKind): number {
  return ITEM_COLOURS[ITEM_KINDS.indexOf(kind)];
}

/** The cartridge draws each item with the background card numbered like its key. */
export function cardOf(kind: ItemKind): number {
  return keyOf(kind);
}

export function isBoat(kind: string): kind is BoatKind {
  return kind === "ptBoat" || kind === "fishingBoat";
}
