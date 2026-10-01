import type { GameRules } from "@utopia/engine";
import type { Aggression } from "./aggression.js";
import type { PlayingStrength } from "./difficulty.js";
import { IDLE, type Intent } from "./intent.js";
import type { IslandView } from "./island-view.js";
import { Build, BuyBoat } from "./orders.js";
import { PurchasePlanner, type Moment, type Purchase, type Shopping } from "./purchases.js";
import { Refusals } from "./refusals.js";
import { anchorings } from "./seafaring.js";
import type { Seamanship } from "./seamanship.js";
import { Valuation } from "./valuation.js";

export interface AgendaSetup {
  readonly strength: PlayingStrength;
  readonly rules: GameRules;
}

/** What became of an intent, as the screen shows it once its steps are over. */
export interface Outcome {
  readonly intent: Intent;
  readonly view: IslandView;
}

/** A governor out fishing comes ashore only for a purchase worth at least this many points. */
const WORTH_COMING_ASHORE = 3;

/**
 * Decides what the governor sets about next, in the order a sound governor would: keep a fishing
 * boat, deal with the other side, build what is worth building, then see to the boats.
 */
export class Agenda {
  private readonly planner: PurchasePlanner;
  private readonly seamanship: Seamanship;
  private readonly aggression: Aggression;
  private readonly refusals = new Refusals();

  constructor(setup: AgendaSetup) {
    const { strength, rules } = setup;
    const valuation = new Valuation({ rules, horizonRounds: strength.horizonRounds });
    this.planner = new PurchasePlanner({ valuation, mistakeChance: strength.mistakeChance });
    this.seamanship = strength.seamanship();
    this.aggression = strength.aggression();
  }

  watch(view: IslandView): void {
    this.refusals.keepTo(view.round());
    this.aggression.watch(view);
  }

  judge(outcome: Outcome): void {
    if (!outcome.intent.cameAbout(outcome.view)) this.refusals.note(outcome.intent);
  }

  chooseIntent(moment: Moment): Intent {
    const { view } = moment;
    const setAside = this.aggression.goldSetAside(view);
    const proposals = [
      ...keepingAFishingBoat(view),
      ...this.aggression.proposals(view),
      ...this.purchases({ ...moment, setAside }),
      ...this.seamanship.proposals(view),
    ];
    return proposals.find((intent) => !this.refusals.includes(intent)) ?? IDLE;
  }

  private purchases(shopping: Shopping): Intent[] {
    const { view } = shopping;
    return this.planner.purchases(shopping).flatMap((purchase) => goingAbout({ purchase, view }));
  }
}

/** The manual's first tip: buy a fishing boat in the first round and keep one all game. */
function keepingAFishingBoat(view: IslandView): Intent[] {
  const needed = view.count("fishingBoat") === 0 && view.isHarbourFree();
  return needed && view.canAfford("fishingBoat") ? [new BuyBoat("fishingBoat")] : [];
}

/** Boats are bought wherever the cursor is; buildings from the cursor, so a sailor comes ashore. */
function goingAbout(plan: { purchase: Purchase; view: IslandView }): Intent[] {
  const { purchase, view } = plan;
  const { item } = purchase;
  if (item === "fishingBoat") return [new BuyBoat(item)];
  if (view.pilotMode() === "cursor") return purchase.sites.map((site) => new Build({ item, site }));
  const worthComingAshore = view.pilotMode() === "sailing" && purchase.worth >= WORTH_COMING_ASHORE;
  return worthComingAshore ? anchorings(view) : [];
}
