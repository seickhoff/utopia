export interface PacerOptions {
  readonly targetFps: number;
  /** a frame arriving this early still counts as due, so 60 Hz jitter never halves the rate */
  readonly toleranceMs: number;
}

const DEFAULTS: PacerOptions = { targetFps: 60, toleranceMs: 2 };

/**
 * Caps rendering at 60 fps whatever the display refresh. On a 120 Hz ProMotion screen
 * requestAnimationFrame fires twice as often as we need; skipping alternate callbacks halves GPU work.
 */
export class FramePacer {
  private lastFrameAt = -Infinity;
  private readonly intervalMs: number;

  constructor(private readonly options: PacerOptions = DEFAULTS) {
    this.intervalMs = 1000 / options.targetFps;
  }

  isDue(nowMs: number): boolean {
    return nowMs - this.lastFrameAt >= this.intervalMs - this.options.toleranceMs;
  }

  markRendered(nowMs: number): void {
    const fellBehind = nowMs - this.lastFrameAt > this.intervalMs * 2;
    this.lastFrameAt = fellBehind ? nowMs : this.lastFrameAt + this.intervalMs;
  }
}
