export interface GovernorOptions {
  readonly devicePixelRatio: number;
  readonly levels?: readonly number[];
}

const LEVELS = [1.5, 1.25, 1];
const SAMPLE_FRAMES = 60;
const SLOW_FRAME_MS = 19;
const GOOD_FRAME_MS = 17.5;
const IGNORED_GAP_MS = 250;
const FIRST_RETRY_MS = 15_000;
/** a slowdown this soon after stepping up means the higher level was too much */
const RETRY_PROBATION_MS = 10_000;

/**
 * Picks the render pixel ratio. A 2x Retina screen at full ratio draws 4x the pixels, which is
 * what heats a laptop. Starts at 1.5, steps down while frames run slow, and retries a higher
 * level only after sustained headroom, waiting twice as long each time a retry fails.
 */
export class QualityGovernor {
  private readonly levels: readonly number[];
  private level = 0;
  private samples: number[] = [];
  private goodStreakMs = 0;
  private retryAfterMs = FIRST_RETRY_MS;
  private msSinceRetry = Infinity;

  constructor(private readonly options: GovernorOptions) {
    this.levels = options.levels ?? LEVELS;
  }

  recordFrame(intervalMs: number): void {
    if (intervalMs > IGNORED_GAP_MS) return;
    this.sample(intervalMs);
    if (this.isRunningSlow()) this.stepDown();
    else if (this.goodStreakMs >= this.retryAfterMs) this.stepUp();
  }

  pixelRatio(): number {
    return Math.min(this.options.devicePixelRatio, this.levels[this.level]);
  }

  private sample(intervalMs: number): void {
    this.samples.push(intervalMs);
    if (this.samples.length > SAMPLE_FRAMES) this.samples.shift();
    this.goodStreakMs = intervalMs <= GOOD_FRAME_MS ? this.goodStreakMs + intervalMs : 0;
    this.msSinceRetry += intervalMs;
  }

  private isRunningSlow(): boolean {
    if (this.samples.length < SAMPLE_FRAMES) return false;
    const average = this.samples.reduce((sum, sample) => sum + sample, 0) / this.samples.length;
    return average > SLOW_FRAME_MS;
  }

  private stepDown(): void {
    if (this.msSinceRetry < RETRY_PROBATION_MS) this.retryAfterMs *= 2;
    this.level = Math.min(this.level + 1, this.levels.length - 1);
    this.msSinceRetry = Infinity;
    this.resetMeasurements();
  }

  private stepUp(): void {
    if (this.level > 0) {
      this.level -= 1;
      this.msSinceRetry = 0;
    }
    this.resetMeasurements();
  }

  private resetMeasurements(): void {
    this.samples = [];
    this.goodStreakMs = 0;
  }
}
