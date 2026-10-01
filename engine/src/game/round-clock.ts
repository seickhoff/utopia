import type { GameOptions } from "./game-options.js";

/** The cartridge's timer task runs 20 times a second (TICTSK). */
export const TICKS_PER_SECOND = 20;

/** The term of office and the turn in progress: TICSEC, REMSEC, CURTRN and NUMTRN. */
export class RoundClock {
  private current = 1;
  private played = 0;
  private ticksIntoSecond = 0;
  private remaining: number;

  constructor(private readonly options: GameOptions) {
    this.remaining = options.roundSeconds;
  }

  /** The round being played, or just scored. */
  get round(): number {
    return this.current;
  }

  get rounds(): number {
    return this.options.rounds;
  }

  /** What the status bar shows as turns left: the term less the rounds scored. */
  get roundsLeft(): number {
    return this.options.rounds - this.played;
  }

  get secondsLeft(): number {
    return this.remaining;
  }

  tick(): void {
    this.ticksIntoSecond = (this.ticksIntoSecond + 1) % TICKS_PER_SECOND;
    if (this.ticksIntoSecond === 0) this.remaining = Math.max(0, this.remaining - 1);
  }

  hasRunOut(): boolean {
    return this.remaining === 0;
  }

  recordRoundPlayed(): void {
    this.played += 1;
  }

  isTermOver(): boolean {
    return this.played >= this.options.rounds;
  }

  beginNextRound(): void {
    this.current += 1;
    this.remaining = this.options.roundSeconds;
  }
}
