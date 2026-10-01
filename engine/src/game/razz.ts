import type { Side } from "../board/side.js";
import { NO_SELECTION, type RazzReason } from "../pilots/keypad.js";
import type { World } from "./world.js";

export interface Refusal {
  readonly side: Side;
  readonly reason: RazzReason;
}

/** The RAZZ: the cartridge's buzz of refusal, which also wipes the governor's selection. */
export function razz(world: World, refusal: Refusal): void {
  world.selections.choose(refusal.side, NO_SELECTION);
  world.events.record({ type: "razzed", ...refusal });
}
