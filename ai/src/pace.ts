import type { RandomSource } from "@utopia/engine";

export interface PaceSetup {
  /** Seconds to take in the screen before setting about something new. */
  readonly reactionSeconds: number;
  /** Seconds between key presses, and between arriving somewhere and the first. */
  readonly keyGapSeconds: number;
  readonly random: RandomSource;
}

/** No person is quite regular: each wait is drawn from within a quarter either side of the usual. */
const IRREGULARITY = 0.25;

/** How quickly a governor's hands move. */
export class Pace {
  constructor(private readonly setup: PaceSetup) {}

  drawReaction(): number {
    return this.drawAbout(this.setup.reactionSeconds);
  }

  drawKeyGap(): number {
    return this.drawAbout(this.setup.keyGapSeconds);
  }

  private drawAbout(seconds: number): number {
    const spread = (2 * this.setup.random.next() - 1) * IRREGULARITY;
    return seconds * (1 + spread);
  }
}
