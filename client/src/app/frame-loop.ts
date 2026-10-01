import { FramePacer } from "./frame-pacer.js";
import type { FrameCallbacks, FrameDriver } from "./game-runner.js";
import { QualityGovernor } from "./quality-governor.js";

export interface FrameLoopSetup extends FrameCallbacks {
  readonly devicePixelRatio: number;
}

const RECENT_FRAMES_KEPT = 150;
const RECENT_FRAMES_DROPPED = 30;
const ONE_SECOND_MS = 1000;

/**
 * requestAnimationFrame, paced to 60 fps and feeding frame times to the quality governor.
 * It runs only while a game is being played; menus cost no frames at all.
 */
export class FrameLoop implements FrameDriver {
  private readonly pacer = new FramePacer();
  private readonly governor: QualityGovernor;
  private running = false;
  private handle = 0;
  private lastFrameMs = Number.NaN;
  private recentFrames: number[] = [];

  constructor(private readonly setup: FrameLoopSetup) {
    this.governor = new QualityGovernor({ devicePixelRatio: setup.devicePixelRatio });
  }

  pixelRatio(): number {
    return this.governor.pixelRatio();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.handle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
    this.lastFrameMs = Number.NaN;
  }

  isRunning(): boolean {
    return this.running;
  }

  framesPerSecond(): number {
    const now = performance.now();
    return this.recentFrames.filter((at) => now - at < ONE_SECOND_MS).length;
  }

  private readonly tick = (nowMs: number): void => {
    if (!this.running) return;
    this.handle = requestAnimationFrame(this.tick);
    if (!this.pacer.isDue(nowMs)) return;
    this.pacer.markRendered(nowMs);
    this.measure(nowMs);
    this.setup.onFrame(nowMs);
  };

  private measure(nowMs: number): void {
    if (!Number.isNaN(this.lastFrameMs)) this.recordInterval(nowMs - this.lastFrameMs);
    this.lastFrameMs = nowMs;
    this.recentFrames.push(nowMs);
    if (this.recentFrames.length > RECENT_FRAMES_KEPT) {
      this.recentFrames.splice(0, RECENT_FRAMES_DROPPED);
    }
  }

  private recordInterval(intervalMs: number): void {
    const before = this.governor.pixelRatio();
    this.governor.recordFrame(intervalMs);
    const after = this.governor.pixelRatio();
    if (after !== before) this.setup.onPixelRatioChange(after);
  }
}
