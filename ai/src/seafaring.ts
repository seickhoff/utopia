import { BOAT_KEY, type DrifterKind, type Square } from "@utopia/engine";
import { anchoragesFor } from "./fishing.js";
import type { Intent } from "./intent.js";
import type { IslandView } from "./island-view.js";
import type { Pace } from "./pace.js";
import {
  ChaseFish,
  HoldStation,
  Pause,
  PressKey,
  SailTo,
  SteerCursor,
  Tidy,
  type Guard,
  type Step,
} from "./steps.js";

/** How long a fishing trip runs before the governor looks round for something better to do. */
const FISHING_STINT_SECONDS = 6;
/** A raid gives up if the other side's boat has not sunk by then (it takes 20 rams at a tick). */
const RAID_SECONDS = 40;
/** How many anchorages to offer, so one found wanting is not the end of anchoring. */
const ANCHORAGE_CHOICES = 3;

/** Flies the cursor onto one of the governor's anchored boats and takes it out (key 0). */
export class TakeOut implements Intent {
  readonly key: string;

  constructor(private readonly mooring: Square) {
    this.key = `take out ${mooring.offset}`;
  }

  stepsAt(pace: Pace): Step[] {
    const mooring = this.mooring;
    const guard: Guard = (view) =>
      view.pilotMode() === "cursor" &&
      view.pilotSquare() === mooring &&
      hasOwnBoatAt(view, mooring);
    return [
      new Tidy(),
      new Pause(pace.drawReaction()),
      new SteerCursor(mooring),
      new Pause(pace.drawKeyGap()),
      new PressKey({ key: BOAT_KEY, guard }),
    ];
  }

  cameAbout(view: IslandView): boolean {
    return view.pilotMode() === "sailing";
  }
}

/** Sails to open water and drops anchor there (key 0), handing the governor back the cursor. */
export class Anchor implements Intent {
  readonly key: string;

  constructor(private readonly anchorage: Square) {
    this.key = `anchor at ${anchorage.offset}`;
  }

  stepsAt(pace: Pace): Step[] {
    const anchorage = this.anchorage;
    const guard: Guard = (view) =>
      view.pilotMode() === "sailing" &&
      view.pilotSquare() === anchorage &&
      view.isOpenWater(anchorage);
    return [
      new Tidy(),
      new Pause(pace.drawReaction()),
      new SailTo(anchorage),
      new Pause(pace.drawKeyGap()),
      new PressKey({ key: BOAT_KEY, guard }),
    ];
  }

  cameAbout(view: IslandView): boolean {
    return view.pilotMode() !== "sailing";
  }
}

/** A spell of chasing schools of fish in the fishing boat. */
export class Fish implements Intent {
  readonly key = "fish";

  constructor(private readonly manner: { readonly hazards: readonly DrifterKind[] }) {}

  stepsAt(): Step[] {
    return [new ChaseFish({ seconds: FISHING_STINT_SECONDS, hazards: this.manner.hazards })];
  }

  cameAbout(): boolean {
    return true;
  }
}

/** Sits a PT boat on the other side's anchored fishing boat, ramming it until it sinks. */
export class Raid implements Intent {
  readonly key: string;

  constructor(private readonly target: Square) {
    this.key = `raid ${target.offset}`;
  }

  stepsAt(): Step[] {
    const target = this.target;
    const sunk: Guard = (view) => !view.opponent().holds({ square: target, item: "fishingBoat" });
    return [new HoldStation({ square: target, seconds: RAID_SECONDS, until: sunk })];
  }

  cameAbout(): boolean {
    return true;
  }
}

/** Anchoring at the best of the safe anchorages. */
export function anchorings(view: IslandView): Intent[] {
  return anchoragesFor(view)
    .slice(0, ANCHORAGE_CHOICES)
    .map((anchorage) => new Anchor(anchorage));
}

function hasOwnBoatAt(view: IslandView, square: Square): boolean {
  return view.holds({ square, item: "fishingBoat" }) || view.holds({ square, item: "ptBoat" });
}
