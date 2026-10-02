import type { ScreenPosition } from "../board/screen-position.js";

/** A finger on the board: which one it is, and where on the page. */
export interface Finger extends ScreenPosition {
  readonly pointerId: number;
}

/** The 3D view's camera, as two fingers turn it. */
export interface CameraTurns {
  tiltBy(degrees: number): void;
  turnBy(degrees: number): void;
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
/**
 * How far two fingers must twist before the view starts turning round with them: a pinch or a
 * tilt twists the fingers a little anyway, and that should not turn the view.
 */
const TWIST_START_DEGREES = 12;

/** What the fingers down are doing: one held still, one dragging, or two turning the camera. */
type Gesture = "still" | "dragging" | "turning";

/** Two fingers: how far apart, how far down the page their middle is, and the line between them's angle. */
interface Span {
  readonly apart: number;
  readonly middleY: number;
  /** Degrees, growing clockwise on the page. */
  readonly angle: number;
}

/** A finger's move: where it is now, and how the first two fingers stood before it. */
interface Step {
  readonly at: ScreenPosition;
  readonly before: Span | "unpaired";
}

/**
 * Fingers on the board. One finger tapped acts where it lifts; one finger dragged leads the cursor,
 * or drives the boat as a thumbstick. Two fingers work the 3D camera: spread or pinch to zoom, slide up or down together
 * to tilt, twist to turn the view round, the board turning with them as a map does; and once two
 * have touched, nothing taps until every finger is off the glass.
 */
export class TouchGestures {
  private readonly fingers = new Map<number, ScreenPosition>();
  private gesture: Gesture = "still";
  /** Where the lone finger came down, to tell a tap from a drag. */
  private landed: ScreenPosition = { clientX: 0, clientY: 0 };
  /** How far the two fingers have twisted since they came down, and whether the view has started turning. */
  private twisted = 0;
  private turningRound = false;
  private readonly moves: Readonly<Record<Gesture, (step: Step) => void>> = {
    still: (step) => this.stir(step.at),
    dragging: (step) => this.work.drag({ from: this.landed, to: step.at }),
    turning: (step) => this.turn(step.before),
  };

  constructor(private readonly work: FingerWork) {}

  down(finger: Finger): void {
    this.fingers.set(finger.pointerId, positionOf(finger));
    if (this.fingers.size === 1) this.land(finger);
    else this.pair();
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

  private pair(): void {
    this.gesture = "turning";
    this.twisted = 0;
    this.turningRound = false;
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
    this.twist(turnBetween(before.angle, after.angle));
  }

  /**
   * Turns the view against the fingers' twist, so the board turns with them; only once they have
   * twisted past the start, and from there with every degree they twist.
   */
  private twist(degrees: number): void {
    this.twisted += degrees;
    if (!this.turningRound && Math.abs(this.twisted) < TWIST_START_DEGREES) return;
    const turned = this.turningRound
      ? degrees
      : this.twisted - Math.sign(this.twisted) * TWIST_START_DEGREES;
    this.turningRound = true;
    this.work.camera.turnBy(-turned);
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
  const [across, down] = [second.clientX - first.clientX, second.clientY - first.clientY];
  return {
    apart: Math.max(1, Math.hypot(across, down)),
    middleY: (first.clientY + second.clientY) / 2,
    angle: (Math.atan2(down, across) * 180) / Math.PI,
  };
}

/** The shorter turn from one angle to another, in degrees: never more than half a circle either way. */
function turnBetween(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}
