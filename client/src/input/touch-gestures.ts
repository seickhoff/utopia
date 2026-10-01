import type { ScreenPosition } from "../board/screen-position.js";

/** A finger on the board: which one it is, and where on the page. */
export interface Finger extends ScreenPosition {
  readonly pointerId: number;
}

/** The 3D view's camera, as two fingers turn it. */
export interface CameraTurns {
  tiltBy(degrees: number): void;
  zoomBy(factor: number): void;
}

/** A lone finger dragged across the glass: where it landed, and where it is now. */
export interface Drag {
  readonly from: ScreenPosition;
  readonly to: ScreenPosition;
}

export interface FingerWork {
  /** A lone finger lifted about where it landed: a tap, there. */
  tap(at: ScreenPosition): void;
  /** A lone finger moving away from where it landed. */
  drag(drag: Drag): void;
  readonly camera: CameraTurns;
}

/** How far a finger may roll and still tap, in page pixels. */
export const TAP_SLOP = 10;

/** How far a drag has carried the finger across the glass, in page pixels. */
export function reachOf(drag: Drag): number {
  return Math.hypot(drag.to.clientX - drag.from.clientX, drag.to.clientY - drag.from.clientY);
}
/** Degrees the view tilts for each page pixel two fingers slide up or down together. */
const TILT_PER_PIXEL = 0.25;

/** What the fingers down are doing: one held still, one dragging, or two turning the camera. */
type Gesture = "still" | "dragging" | "turning";

/** Two fingers: how far apart, and how far down the page their middle is. */
interface Span {
  readonly apart: number;
  readonly middleY: number;
}

/** A finger's move: where it is now, and how the first two fingers stood before it. */
interface Step {
  readonly at: ScreenPosition;
  readonly before: Span | "unpaired";
}

/**
 * Fingers on the board. One finger tapped acts where it lifts; one finger dragged leads the cursor,
 * or drives the boat as a thumbstick. Two fingers work the 3D camera: spread or pinch to zoom, slide up or down together
 * to tilt; and once two have touched, nothing taps until every finger is off the glass.
 */
export class TouchGestures {
  private readonly fingers = new Map<number, ScreenPosition>();
  private gesture: Gesture = "still";
  /** Where the lone finger came down, to tell a tap from a drag. */
  private landed: ScreenPosition = { clientX: 0, clientY: 0 };
  private readonly moves: Readonly<Record<Gesture, (step: Step) => void>> = {
    still: (step) => this.stir(step.at),
    dragging: (step) => this.work.drag({ from: this.landed, to: step.at }),
    turning: (step) => this.turn(step.before),
  };

  constructor(private readonly work: FingerWork) {}

  down(finger: Finger): void {
    this.fingers.set(finger.pointerId, positionOf(finger));
    if (this.fingers.size === 1) this.land(finger);
    else this.gesture = "turning";
  }

  move(finger: Finger): void {
    if (!this.fingers.has(finger.pointerId)) return;
    const before = spanOf(this.fingers);
    this.fingers.set(finger.pointerId, positionOf(finger));
    this.moves[this.gesture]({ at: positionOf(finger), before });
  }

  up(finger: Finger): void {
    const tapped = this.gesture === "still" && this.fingers.size === 1;
    this.forget(finger);
    if (tapped) this.work.tap(positionOf(finger));
  }

  /** The browser has taken the touch for itself: the finger is gone, with no tap. */
  cancel(finger: Finger): void {
    this.forget(finger);
  }

  private land(finger: Finger): void {
    this.gesture = "still";
    this.landed = positionOf(finger);
  }

  /** A still finger that rolls past the slop stops being a tap and starts to drag. */
  private stir(at: ScreenPosition): void {
    if (reachOf({ from: this.landed, to: at }) <= TAP_SLOP) return;
    this.gesture = "dragging";
    this.work.drag({ from: this.landed, to: at });
  }

  private turn(before: Span | "unpaired"): void {
    const after = spanOf(this.fingers);
    if (before === "unpaired" || after === "unpaired") return;
    this.work.camera.zoomBy(after.apart / before.apart);
    this.work.camera.tiltBy((after.middleY - before.middleY) * TILT_PER_PIXEL);
  }

  private forget(finger: Finger): void {
    this.fingers.delete(finger.pointerId);
    if (this.fingers.size === 0) this.gesture = "still";
  }
}

function positionOf(finger: Finger): ScreenPosition {
  return { clientX: finger.clientX, clientY: finger.clientY };
}

/** The first two fingers down; two fingers on the one spot count as a pixel apart. */
function spanOf(fingers: ReadonlyMap<number, ScreenPosition>): Span | "unpaired" {
  const [first, second] = [...fingers.values()];
  if (first === undefined || second === undefined) return "unpaired";
  const apart = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  return { apart: Math.max(1, apart), middleY: (first.clientY + second.clientY) / 2 };
}
