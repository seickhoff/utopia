/** The camera as it is drawn: its tilt, its heading and zoom, and the point of the floor it looks at. */
export interface CameraState {
  readonly pitchDegrees: number;
  /** Which way it looks across the sea; never wrapped, so it always turns the way it was turned. */
  readonly headingDegrees: number;
  readonly zoom: number;
  readonly x: number;
  readonly z: number;
}

/** A frame's move toward what the player asked for, at this time in milliseconds. */
export interface CameraStep {
  readonly goal: CameraState;
  readonly nowMs: number;
}

type Count = keyof CameraState;
const COUNTS: readonly Count[] = ["pitchDegrees", "headingDegrees", "zoom", "x", "z"];

/** How quickly the camera catches up with a new tilt, heading, zoom or target: most of the way in a quarter second. */
const EASE_PER_SECOND = 9;
/** The longest step a slow frame takes, so the camera never leaps. */
const LONGEST_STEP_SECONDS = 0.1;
/** No frames come while the camera is at rest: the first step after one is a frame's worth. */
const ONE_FRAME_SECONDS = 1 / 60;
/** Nearer its goal than this on every count (degrees, zoom, cards), the camera is at rest. */
const AT_REST = 0.001;

/** The camera easing toward what the player asks for, whatever the frame rate, until it catches up. */
export class CameraEase {
  private shown: CameraState;
  private resting = true;
  private lastStepMs = 0;

  constructor(start: CameraState) {
    this.shown = start;
  }

  step(step: CameraStep): void {
    const share = 1 - Math.exp(-this.secondsSinceLastStep(step.nowMs) * EASE_PER_SECOND);
    const { goal } = step;
    const eased = (count: Count) => this.shown[count] + (goal[count] - this.shown[count]) * share;
    this.shown = {
      pitchDegrees: eased("pitchDegrees"),
      headingDegrees: eased("headingDegrees"),
      zoom: eased("zoom"),
      x: eased("x"),
      z: eased("z"),
    };
    this.resting = COUNTS.every((count) => Math.abs(goal[count] - this.shown[count]) < AT_REST);
    this.lastStepMs = step.nowMs;
  }

  current(): CameraState {
    return this.shown;
  }

  /** Whether the camera has caught up with its goal, so another frame would show it no differently. */
  isAtRest(): boolean {
    return this.resting;
  }

  private secondsSinceLastStep(nowMs: number): number {
    if (this.resting) return ONE_FRAME_SECONDS;
    return Math.min(LONGEST_STEP_SECONDS, Math.max(0, (nowMs - this.lastStepMs) / 1000));
  }
}
