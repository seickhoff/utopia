import type { BoatKind } from "../board/item-kind.js";
import type { LookName } from "../sea/sprite-looks.js";

/** How fast the disc drives a pilot: the cursor at 15, any boat at 10 (DISC_INPUT). */
export interface PilotSpeeds {
  readonly cursorSpeed: number;
  readonly boatSpeed: number;
}

export type PilotModeName = "cursor" | "sailing" | "sinking";
export type Aboard = BoatKind | "none";

/** What a governor's sprite is doing: choosing squares, sailing a boat, or going under. */
export interface PilotMode {
  readonly name: PilotModeName;
  /** The boat being sailed or going under; it still counts until it has sunk (L_55E8). */
  readonly aboard: Aboard;
  /** A sinking boat is held still until it has gone down. */
  readonly isAdrift: boolean;
  readonly look: LookName;
  speedFrom(speeds: PilotSpeeds): number;
}

export const CURSOR: PilotMode = {
  name: "cursor",
  aboard: "none",
  isAdrift: false,
  look: "cursor",
  speedFrom: (speeds) => speeds.cursorSpeed,
};

export function sailing(boat: BoatKind): PilotMode {
  return {
    name: "sailing",
    aboard: boat,
    isAdrift: false,
    look: boat,
    speedFrom: (speeds) => speeds.boatSpeed,
  };
}

export function sinking(boat: Aboard): PilotMode {
  return { name: "sinking", aboard: boat, isAdrift: true, look: "sinkingBoat", speedFrom: () => 0 };
}
