import type { Intent } from "./intent.js";

/** The orders the game refused this round, so the governor does not RAZZ at them again. */
export class Refusals {
  private round = 0;
  private readonly refused = new Set<string>();

  /** A new round is a fresh start: the treasury and the board have changed. */
  keepTo(round: number): void {
    if (round === this.round) return;
    this.round = round;
    this.refused.clear();
  }

  note(intent: Intent): void {
    this.refused.add(intent.key);
  }

  includes(intent: Intent): boolean {
    return this.refused.has(intent.key);
  }
}
