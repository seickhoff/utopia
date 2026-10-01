import { priceOf, type Square } from "@utopia/engine";
import type { IslandView } from "./island-view.js";
import { sitesFor } from "./site-choice.js";
import { PURCHASABLE, type PurchasableKind, type Valuation } from "./valuation.js";

/** Something to buy, where it could go (best first), and what it is worth in points. */
export interface Purchase {
  readonly item: PurchasableKind;
  readonly sites: readonly Square[];
  readonly worth: number;
}

/** A moment of decision, and the roll that decides whether the governor blunders. */
export interface Moment {
  readonly view: IslandView;
  /** A number from 0 to 1, drawn fresh for each decision. */
  readonly whim: number;
}

/** A moment of decision with some of the treasury spoken for. */
export interface Shopping extends Moment {
  /** Gold not to be spent on purchases, being kept for something else. */
  readonly setAside: number;
}

export interface PlannerSetup {
  readonly valuation: Valuation;
  /** The chance that a governor about to buy buys the wrong thing. */
  readonly mistakeChance: number;
}

/** Boats are launched in the harbour; everything else goes on the island. */
const SITES: Readonly<Record<PurchasableKind, (view: IslandView) => Square[]>> = {
  fishingBoat: (view) => (view.isHarbourFree() ? [view.harbour()] : []),
  fort: (view) => sitesFor({ item: "fort", view }),
  factory: (view) => sitesFor({ item: "factory", view }),
  crop: (view) => sitesFor({ item: "crop", view }),
  school: (view) => sitesFor({ item: "school", view }),
  hospital: (view) => sitesFor({ item: "hospital", view }),
  house: (view) => sitesFor({ item: "house", view }),
};

/** Weighs everything the governor could buy now, and lists what is worth buying. */
export class PurchasePlanner {
  constructor(private readonly setup: PlannerSetup) {}

  /** The purchases worth making, best first; now and then a blunder is put ahead of them. */
  purchases(shopping: Shopping): Purchase[] {
    const candidates = this.candidates(shopping).sort((one, other) => other.worth - one.worth);
    const worthwhile = candidates.filter((candidate) => candidate.worth > 0);
    if (worthwhile.length === 0) return worthwhile;
    return [...this.blunderAmong({ candidates, whim: shopping.whim }), ...worthwhile];
  }

  /** A governor about to buy may, on a whim, pick something other than the best. */
  private blunderAmong(choice: { candidates: readonly Purchase[]; whim: number }): Purchase[] {
    const [, ...worse] = choice.candidates;
    const { mistakeChance } = this.setup;
    if (choice.whim >= mistakeChance || worse.length === 0) return [];
    return [worse[Math.floor((choice.whim / mistakeChance) * worse.length)]];
  }

  private candidates(shopping: Shopping): Purchase[] {
    const { view, setAside } = shopping;
    return PURCHASABLE.filter((item) => priceOf(item) <= view.gold() - setAside)
      .map((item) => ({ item, sites: SITES[item](view) }))
      .filter((candidate) => candidate.sites.length > 0)
      .map((candidate) => ({
        ...candidate,
        worth: this.setup.valuation.worthOf(
          { item: candidate.item, site: candidate.sites[0] },
          view,
        ),
      }));
  }
}
