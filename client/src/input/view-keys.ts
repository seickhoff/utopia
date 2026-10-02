import type { ViewAngle } from "../app/view-angle.js";
import type { KeyStroke } from "./key-map.js";

/** A turn of the 3D view asked for from the keyboard. */
export interface ViewTurn {
  applyTo(angle: ViewAngle): void;
}

/** Degrees a press (or a key's repeat) tilts the view. */
const TILT_STEP = 3;
/** Degrees a press (or a key's repeat) turns the view round. */
const TURN_STEP = 4;
/** How much closer, or farther, a press takes the view. */
const ZOOM_STEP = 1.12;

class Tilt implements ViewTurn {
  constructor(private readonly degrees: number) {}

  applyTo(angle: ViewAngle): void {
    angle.tiltBy(this.degrees);
  }
}

class Turn implements ViewTurn {
  constructor(private readonly degrees: number) {}

  applyTo(angle: ViewAngle): void {
    angle.turnBy(this.degrees);
  }
}

class Zoom implements ViewTurn {
  constructor(private readonly factor: number) {}

  applyTo(angle: ViewAngle): void {
    angle.zoomBy(this.factor);
  }
}

/**
 * The camera's own keys, clear of the arrows and WASD that steer: Q and E tilt, [ and ] turn the
 * view round, plus and minus zoom.
 */
const VIEW_KEYS: Readonly<Record<string, ViewTurn>> = {
  BracketLeft: new Turn(-TURN_STEP),
  BracketRight: new Turn(TURN_STEP),
  KeyQ: new Tilt(-TILT_STEP),
  KeyE: new Tilt(TILT_STEP),
  PageUp: new Tilt(-TILT_STEP),
  PageDown: new Tilt(TILT_STEP),
  Equal: new Zoom(ZOOM_STEP),
  NumpadAdd: new Zoom(ZOOM_STEP),
  Minus: new Zoom(1 / ZOOM_STEP),
  NumpadSubtract: new Zoom(1 / ZOOM_STEP),
};

export function viewTurnForKey(stroke: KeyStroke): ViewTurn | "none" {
  return VIEW_KEYS[stroke.code] ?? "none";
}
