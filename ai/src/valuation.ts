import { ItemCounts, priceOf, type GameRules, type ItemKind, type Square } from "@utopia/engine";
import type { IslandView } from "./island-view.js";
import { outlookOf, type Prospect } from "./outlook.js";

/** What the valuation weighs: everything a governor buys for their own island. */
export type PurchasableKind = Exclude<ItemKind, "rebel" | "ptBoat">;

export const PURCHASABLE: readonly PurchasableKind[] = [
  "crop",
  "house",
  "factory",
  "school",
  "hospital",
  "fort",
  "fishingBoat",
];

export interface Offer {
  readonly item: PurchasableKind;
  readonly site: Square;
}

export interface ValuationSetup {
  readonly rules: GameRules;
  /** How many rounds ahead the governor looks when weighing a purchase. */
  readonly horizonRounds: number;
}

/**
 * What a gold bar is worth in points while there are rounds left to spend it in: about what a
 * sound purchase brings per bar. Gold left at the end of the term is worth nothing.
 */
const GOLD_WORTH = 0.25;
const GOLD_WORTH_IN_LAST_ROUND = 0;
/** What guarding one building from rebels is worth for a round. */
const GUARD_WORTH = 2;
/** What a fort keeps rebels from razing, and pirates from ramming. */
const GUARDABLE: readonly ItemKind[] = ["factory", "school", "hospital", "house", "fishingBoat"];

interface Appraisal {
  readonly offer: Offer;
  readonly view: IslandView;
  readonly rules: GameRules;
  readonly rounds: number;
  readonly goldWorth: number;
}

type Appraiser = (appraisal: Appraisal) => number;

const APPRAISERS: Readonly<Record<PurchasableKind, Appraiser>> = {
  fort: guardWorth,
  factory: growthWorth,
  crop: growthWorth,
  school: growthWorth,
  hospital: growthWorth,
  house: growthWorth,
  fishingBoat: growthWorth,
};

/** Weighs a purchase in points: what it adds over the rounds ahead, less what it costs. */
export class Valuation {
  constructor(private readonly setup: ValuationSetup) {}

  worthOf(offer: Offer, view: IslandView): number {
    const rounds = Math.min(this.setup.horizonRounds, view.roundsLeft());
    const goldWorth = view.roundsLeft() > 1 ? GOLD_WORTH : GOLD_WORTH_IN_LAST_ROUND;
    return APPRAISERS[offer.item]({ offer, view, rules: this.setup.rules, rounds, goldWorth });
  }
}

/** What an item adds to the island's scores and earnings, reckoned with and without it. */
function growthWorth(appraisal: Appraisal): number {
  const { offer, rules, rounds, goldWorth } = appraisal;
  const start = prospectOf(appraisal.view);
  const counts = ItemCounts.of(start.counts).plusOne(offer.item).asTally();
  const without = outlookOf({ start, rounds, rules });
  const bought = outlookOf({ start: { ...start, counts }, rounds, rules });
  const gold = bought.gold - without.gold - priceOf(offer.item);
  return bought.points - without.points + gold * goldWorth;
}

/** A fort scores nothing itself; it keeps rebels off the buildings round it. */
function guardWorth(appraisal: Appraisal): number {
  const { offer, view, rounds, goldWorth } = appraisal;
  const guarded = offer.site
    .neighbours()
    .filter((square) => GUARDABLE.some((item) => view.holds({ square, item })))
    .filter((square) => !view.isGuarded(square)).length;
  return guarded * rounds * GUARD_WORTH - priceOf(offer.item) * goldWorth;
}

function prospectOf(view: IslandView): Prospect {
  const { counts, population, goldThisRound, roundScore } = view.standing();
  return { counts, population, goldThisRound, lastRoundScore: roundScore };
}
