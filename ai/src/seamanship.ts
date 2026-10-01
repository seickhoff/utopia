import type { BoatKind, DrifterKind, PilotModeName } from "@utopia/engine";
import type { Intent } from "./intent.js";
import type { IslandView } from "./island-view.js";
import { Fish, TakeOut, anchorings } from "./seafaring.js";

/** What a governor does with their boats when there is nothing to buy. */
export interface Seamanship {
  proposals(view: IslandView): Intent[];
}

/** Leaves the fishing boat anchored where it was launched, fishing whatever swims under it. */
export class StayAtAnchor implements Seamanship {
  proposals(view: IslandView): Intent[] {
    return view.pilotMode() === "sailing" ? anchorings(view) : [];
  }
}

/**
 * Takes the fishing boat out after schools of fish (the manual: a fishing boat bought in the first
 * round and kept pays all game), keeping clear of whatever hazards the governor minds.
 */
export class Fisher implements Seamanship {
  constructor(private readonly hazards: readonly DrifterKind[]) {}

  proposals(view: IslandView): Intent[] {
    const plans: Readonly<Record<PilotModeName, () => Intent[]>> = {
      cursor: () => [...takeOuts({ view, boat: "fishingBoat" }), ...harbourClearing(view)],
      sailing: () =>
        view.isSailing("fishingBoat") ? [new Fish({ hazards: this.hazards })] : anchorings(view),
      sinking: () => [],
    };
    return plans[view.pilotMode()]();
  }
}

/** Taking out one of the governor's anchored boats, the nearest first. */
export function takeOuts(fleet: { view: IslandView; boat: BoatKind }): Intent[] {
  const { view, boat } = fleet;
  const cursor = view.pilotSquare();
  const apart = (square: { row: number; col: number }) =>
    Math.max(Math.abs(square.row - cursor.row), Math.abs(square.col - cursor.col));
  return view
    .anchoredBoats(boat)
    .sort((one, other) => apart(one) - apart(other))
    .map((mooring) => new TakeOut(mooring));
}

/** A PT boat left in the harbour stops a fishing boat being bought, so it is moved out. */
function harbourClearing(view: IslandView): Intent[] {
  const harbour = view.harbour();
  return view.holds({ square: harbour, item: "ptBoat" }) ? [new TakeOut(harbour)] : [];
}
