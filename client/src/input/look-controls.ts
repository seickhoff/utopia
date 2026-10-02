import type { ViewAngle } from "../app/view-angle.js";
import type { ScreenPosition } from "../board/screen-position.js";
import { isTyping } from "./keyboard-controls.js";
import { zoomOfWheel, type BoardPicker, type PointerStyle } from "./pointer-controls.js";
import { TouchGestures } from "./touch-gestures.js";
import { viewTurnForKey } from "./view-keys.js";

type KeyTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export interface LookSetup {
  /** Where the pointer looks round: the board's stage. */
  readonly surface: HTMLElement;
  /** Where the camera keys are heard: the window. */
  readonly keys: KeyTarget;
  readonly picker: BoardPicker;
  readonly view: ViewAngle;
}

/** Special Case: no one to tell that the camera has turned. */
const NO_ONE = (): void => {};

/**
 * The camera's own controls, once the game is over and nothing else plays: the islands stay as
 * they were left, and the player looks round them. Zoomed in, the 3D view comes closer to wherever
 * the mouse points or a finger drags, as it followed the cursor in play; the wheel, two fingers
 * and the camera keys zoom and tilt it as ever.
 */
export class LookControls {
  private readonly styles: Readonly<Record<string, PointerStyle>>;
  private turned: () => void = NO_ONE;

  constructor(private readonly setup: LookSetup) {
    const mouse: PointerStyle = {
      down: () => {},
      move: (event) => this.lookAt(event),
      up: () => {},
      cancel: () => {},
    };
    const fingers = new TouchGestures({
      tap: () => {},
      drag: (drag) => this.lookAt(drag.to),
      camera: setup.view,
    });
    this.styles = { mouse, pen: mouse, touch: fingers };
  }

  /** Listens to the camera's controls, telling `turned` each time they may have moved it. */
  attach(turned: () => void): void {
    this.turned = turned;
    const { surface, keys } = this.setup;
    surface.addEventListener("pointermove", this.onMove);
    surface.addEventListener("pointerdown", this.onDown);
    surface.addEventListener("pointerup", this.onUp);
    surface.addEventListener("pointercancel", this.onCancel);
    surface.addEventListener("wheel", this.onWheel, { passive: false });
    keys.addEventListener("keydown", this.onKeyDown);
  }

  /** Lets go of the controls; the camera comes closer to the player's cursor or boat again. */
  detach(): void {
    const { surface, keys } = this.setup;
    surface.removeEventListener("pointermove", this.onMove);
    surface.removeEventListener("pointerdown", this.onDown);
    surface.removeEventListener("pointerup", this.onUp);
    surface.removeEventListener("pointercancel", this.onCancel);
    surface.removeEventListener("wheel", this.onWheel);
    keys.removeEventListener("keydown", this.onKeyDown);
    this.turned = NO_ONE;
    this.setup.view.followPilot();
  }

  private styleOf(event: PointerEvent): PointerStyle {
    return this.styles[event.pointerType] ?? this.styles.mouse;
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.styleOf(event).move(event);
    this.turned();
  };
  private readonly onDown = (event: PointerEvent): void => this.styleOf(event).down(event);
  private readonly onUp = (event: PointerEvent): void => this.styleOf(event).up(event);
  private readonly onCancel = (event: PointerEvent): void => this.styleOf(event).cancel(event);

  /** The camera comes closer to the point of the sea under the pointer, or nearest it. */
  private lookAt(at: ScreenPosition): void {
    const point = this.setup.picker.nearestRomPoint(at);
    if (point !== "outside") this.setup.view.lookAt(point);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setup.view.zoomBy(zoomOfWheel(event));
    this.turned();
  };

  private readonly onKeyDown = (event: Event): void => {
    const keyboard = event as KeyboardEvent;
    const turn = viewTurnForKey(keyboard);
    if (turn === "none" || isTyping(keyboard)) return;
    keyboard.preventDefault();
    turn.applyTo(this.setup.view);
    this.turned();
  };
}
