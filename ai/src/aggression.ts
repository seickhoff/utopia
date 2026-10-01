import { priceOf, type PilotModeName, type Square } from "@utopia/engine";
import type { Intent } from "./intent.js";
import type { IslandView } from "./island-view.js";
import { Build, BuyBoat, plantingAgainst } from "./orders.js";
import { Raid, anchorings } from "./seafaring.js";
import { takeOuts } from "./seamanship.js";
import { sitesFor } from "./site-choice.js";

/** How a governor deals with the other side: rebels to plant and fishing boats to ram. */
export interface Aggression {
  /** Looks at every snapshot, to notice what the other side does. */
  watch(view: IslandView): void;
  proposals(view: IslandView): Intent[];
  /** Gold kept back from building, for the mischief in mind. */
  goldSetAside(view: IslandView): number;
}

/** A PT boat is only bought with this much gold to spare beyond it, for the island's own needs. */
const RESERVE = 20;
/** Planned rebel bands a round, on top of any owed in answer. */
const PLANTED_A_ROUND = 1;
/** How far behind on total score a governor must fall before taking aggressive action. */
const TRAILING_MARGIN = 20;

/** Easy: never lifts a finger against the other island. */
export class Peaceful implements Aggression {
  watch(): void {}

  proposals(): Intent[] {
    return [];
  }

  goldSetAside(): number {
    return 0;
  }
}

/** Normal: answers each rebel band the other side lands on its island with one of its own. */
export class Retaliatory implements Aggression {
  private owed = 0;
  private ours = 0;
  private theirs = 0;

  /** Only the other governor lands rebels mid-round; rebels rising at a round's end are unrest. */
  watch(view: IslandView): void {
    const ours = view.count("rebel");
    const theirs = view.opponent().count("rebel");
    if (view.isPlaying()) {
      this.owed = Math.max(0, this.owed + risen(ours, this.ours) - risen(theirs, this.theirs));
    }
    this.ours = ours;
    this.theirs = theirs;
  }

  proposals(view: IslandView): Intent[] {
    return this.owed > 0 && view.canAfford("rebel") ? [plantingAgainst(view)] : [];
  }

  goldSetAside(): number {
    return this.owed > 0 ? priceOf("rebel") : 0;
  }
}

/**
 * Hard: retaliates, and when behind takes aggressive action as the manual advises, a fort built
 * first: a rebel band a round, and PT boat raids on fishing boats anchored where no fort guards.
 */
export class Scheming implements Aggression {
  private readonly retaliation = new Retaliatory();
  private round = 0;
  private theirsAtRoundStart = 0;

  watch(view: IslandView): void {
    this.retaliation.watch(view);
    if (view.round() === this.round) return;
    this.round = view.round();
    this.theirsAtRoundStart = view.opponent().count("rebel");
  }

  proposals(view: IslandView): Intent[] {
    const answers = this.retaliation.proposals(view);
    if (!isFarBehind(view)) return answers;
    if (view.count("fort") === 0) return [...answers, ...fortFirst(view)];
    return [...answers, ...raids(view), ...this.plantings(view)];
  }

  goldSetAside(view: IslandView): number {
    const owed = this.retaliation.goldSetAside();
    if (!isFarBehind(view)) return owed;
    return owed + priceOf(view.count("fort") === 0 ? "fort" : "rebel");
  }

  private plantings(view: IslandView): Intent[] {
    const planted = view.opponent().count("rebel") - this.theirsAtRoundStart;
    const room = view.opponent().hasRebelLandingSite();
    return planted < PLANTED_A_ROUND && view.canAfford("rebel") && room
      ? [plantingAgainst(view)]
      : [];
  }
}

function risen(now: number, before: number): number {
  return Math.max(0, now - before);
}

function isFarBehind(view: IslandView): boolean {
  return view.opponent().totalScore() - view.totalScore() >= TRAILING_MARGIN;
}

function fortFirst(view: IslandView): Intent[] {
  if (!view.canAfford("fort")) return [];
  const [site] = sitesFor({ item: "fort", view });
  return site === undefined ? [] : ashore(view, () => [new Build({ item: "fort", site })]);
}

/** What is done with the cursor waits till a governor out in a boat has come ashore. */
function ashore(view: IslandView, then: () => Intent[]): Intent[] {
  const plans: Readonly<Record<PilotModeName, () => Intent[]>> = {
    cursor: then,
    sailing: () => anchorings(view),
    sinking: () => [],
  };
  return plans[view.pilotMode()]();
}

/** A PT boat sits on an anchored fishing boat until twenty rams sink it. */
function raids(view: IslandView): Intent[] {
  const targets = unguardedFishingBoats(view);
  if (targets.length === 0) return [];
  if (view.isSailing("ptBoat")) return targets.map((target) => new Raid(target));
  if (view.count("ptBoat") > 0) return ashore(view, () => takeOuts({ view, boat: "ptBoat" }));
  const affordable = view.gold() >= priceOf("ptBoat") + RESERVE;
  return view.isHarbourFree() && affordable ? [new BuyBoat("ptBoat")] : [];
}

function unguardedFishingBoats(view: IslandView): Square[] {
  const opponent = view.opponent();
  return opponent.anchoredBoats("fishingBoat").filter((square) => !opponent.isGuarded(square));
}
