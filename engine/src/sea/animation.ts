/**
 * The EXEC steps a sprite's pictures with an 8-bit rate added to an accumulator every tick; each
 * overflow moves on one picture.
 */
const OVERFLOW = 256;

export interface AnimationPace {
  readonly frames: number;
  readonly rate: number;
}

export class Animation {
  private accumulated = 0;
  private stepped = 0;

  constructor(private readonly pace: AnimationPace) {}

  /** The picture showing now, cycling round the loop. */
  frame(): number {
    return this.stepped % this.pace.frames;
  }

  /** Whether the loop has played through once (the EXEC's timeout for a sinking boat). */
  hasPlayedOnce(): boolean {
    return this.stepped >= this.pace.frames;
  }

  tick(): void {
    this.accumulated += this.pace.rate;
    while (this.accumulated >= OVERFLOW) {
      this.accumulated -= OVERFLOW;
      this.stepped += 1;
    }
  }
}
