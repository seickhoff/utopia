import {
  keyOf,
  type BoatKind,
  type BuildingKind,
  type ItemKind,
  type Square,
} from "@utopia/engine";
import type { Intent } from "./intent.js";
import type { IslandView } from "./island-view.js";
import type { Pace } from "./pace.js";
import { Pause, PressKey, SteerCursor, Tidy, type Guard, type Step } from "./steps.js";

export interface BuildingPlan {
  readonly item: BuildingKind;
  readonly site: Square;
}

/** Flies the cursor onto a square of the island, then keys in a building. */
export class Build implements Intent {
  readonly key: string;

  constructor(private readonly plan: BuildingPlan) {
    this.key = `build ${plan.item} at ${plan.site.offset}`;
  }

  stepsAt(pace: Pace): Step[] {
    const { item, site } = this.plan;
    const guard: Guard = (view) =>
      view.pilotMode() === "cursor" &&
      view.pilotSquare() === site &&
      view.isBuildable(site) &&
      view.canAfford(item);
    return [
      new Tidy(),
      new Pause(pace.drawReaction()),
      new SteerCursor(site),
      ...keyedOrder({ item, guard, pace }),
    ];
  }

  cameAbout(view: IslandView): boolean {
    return view.holds({ square: this.plan.site, item: this.plan.item });
  }
}

/** Keys in a boat, which is launched in the harbour wherever the cursor is. */
export class BuyBoat implements Intent {
  readonly key: string;

  constructor(private readonly boat: BoatKind) {
    this.key = `buy ${boat}`;
  }

  stepsAt(pace: Pace): Step[] {
    const guard: Guard = (view) => view.isHarbourFree() && view.canAfford(this.boat);
    return [
      new Tidy(),
      new Pause(pace.drawReaction()),
      ...keyedOrder({ item: this.boat, guard, pace }),
    ];
  }

  cameAbout(view: IslandView): boolean {
    return view.holds({ square: view.harbour(), item: this.boat });
  }
}

/** Keys in a rebel band, which the game lands on the other island. */
export class PlantRebel implements Intent {
  readonly key = "plant rebel";

  constructor(private readonly before: { readonly rebelsThere: number }) {}

  stepsAt(pace: Pace): Step[] {
    const guard: Guard = (view) => view.canAfford("rebel") && view.opponent().hasRebelLandingSite();
    return [
      new Tidy(),
      new Pause(pace.drawReaction()),
      ...keyedOrder({ item: "rebel", guard, pace }),
    ];
  }

  cameAbout(view: IslandView): boolean {
    return view.opponent().count("rebel") > this.before.rebelsThere;
  }
}

/** A rebel band for the other island, reckoned against the rebels already there. */
export function plantingAgainst(view: IslandView): PlantRebel {
  return new PlantRebel({ rebelsThere: view.opponent().count("rebel") });
}

interface KeyedOrder {
  readonly item: ItemKind;
  readonly guard: Guard;
  readonly pace: Pace;
}

/** An order keyed in as a person keys it: the item's key, a moment's pause, then Enter. */
function keyedOrder(order: KeyedOrder): Step[] {
  const { item, guard, pace } = order;
  return [
    new Pause(pace.drawKeyGap()),
    new PressKey({ key: keyOf(item), guard: (view) => !view.hasSelection() && guard(view) }),
    new Pause(pace.drawKeyGap()),
    new PressKey({ key: "enter", guard: (view) => view.selection() === item && guard(view) }),
  ];
}
