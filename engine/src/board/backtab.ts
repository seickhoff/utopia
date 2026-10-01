import { FISHING_BOAT_CARD, PT_BOAT_CARD, SINKING_CARD_BASE } from "../rom/bitmap.js";
import { cardOf, type BoatKind } from "./item-kind.js";
import type { SquareContent } from "./square-content.js";

/** Open water shows the blank system-ROM card, which has no foreground pixels. */
export const BLANK_CARD = -1;

/** A sinking anchored boat: which boat it was, and how far it has gone down. */
export interface Wreck {
  readonly boat: BoatKind;
  /** 0 still shows the boat; 1-8 show the sinking cards. */
  readonly frame: number;
}

export const NO_WRECK: Wreck = { boat: "fishingBoat", frame: 0 };

const BOAT_CARDS: Readonly<Record<BoatKind, number>> = {
  ptBoat: PT_BOAT_CARD,
  fishingBoat: FISHING_BOAT_CARD,
};

/** The cartridge card a square shows, as BACKTAB holds it. */
export function backtabCard(content: SquareContent, wreck: Wreck): number {
  if (content.occupant === "wreck") return wreckCard(wreck);
  if (content.occupant !== "nothing") return cardOf(content.occupant);
  return content.terrain === "land" ? content.coastCard : BLANK_CARD;
}

function wreckCard(wreck: Wreck): number {
  return wreck.frame === 0 ? BOAT_CARDS[wreck.boat] : SINKING_CARD_BASE + wreck.frame;
}
