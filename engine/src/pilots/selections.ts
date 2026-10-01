import type { Side } from "../board/side.js";
import { NO_SELECTION, type Selection } from "./keypad.js";

/** What each governor has keyed in and not yet bought (SLCT_0, SLCT_1). */
export class Selections {
  private readonly chosen = new Map<Side, Selection>();

  of(side: Side): Selection {
    return this.chosen.get(side) ?? NO_SELECTION;
  }

  choose(side: Side, selection: Selection): void {
    this.chosen.set(side, selection);
  }
}
