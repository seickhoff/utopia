import type { PixelPoint } from "@utopia/engine";
import type { ViewAngle } from "../app/view-angle.js";
import type { HandController } from "./hand-controller.js";
import type { ScreenPosition } from "./screen-position.js";
import type { Steerer } from "./steerer.js";
import { TouchGestures } from "./touch-gestures.js";

/** Port for the view that knows which point of the playfield a pointer is over. */
export interface BoardPicker {
  romPointAt(position: ScreenPosition): PixelPoint | "outside";
  /** The same, but a pointer just past the playfield's edge counts as at the nearest point on it. */
  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside";
}

export interface PointerSetup {
  readonly surface: HTMLElement;
  readonly picker: BoardPicker;
  readonly steerer: Steerer;
  readonly controller: HandController;
  readonly view: ViewAngle;
}

/** How much closer one notch of a mouse wheel (about 100 of its units) takes the view. */
const ZOOM_PER_WHEEL_UNIT = 0.0015;

const MAIN_BUTTON = 0;

/** How a kind of pointer plays: a mouse or a pen acts as it presses, a finger as it lifts. */
interface PointerStyle {
  down(event: PointerEvent): void;
  move(event: PointerEvent): void;
  up(event: PointerEvent): void;
  cancel(event: PointerEvent): void;
}

/**
 * The mouse, a pen or fingers on the board. The cursor follows the mouse, a click acts, and a
 * right click clears; a finger taps to act, drags to lead, and two work the 3D camera.
 */
export class PointerControls {
  private readonly mouse: PointerStyle = {
    down: (event) => this.press(event),
    move: (event) => this.lead(event),
    up: () => {},
    cancel: () => {},
  };
  private readonly styles: Readonly<Record<string, PointerStyle>>;

  constructor(private readonly setup: PointerSetup) {
    const fingers = new TouchGestures({
      tap: (at) => this.act(at),
      lead: (at) => this.lead(at),
      camera: setup.view,
    });
    this.styles = { mouse: this.mouse, pen: this.mouse, touch: fingers };
  }

  attach(): void {
    const { surface } = this.setup;
    surface.addEventListener("pointermove", this.onMove);
    surface.addEventListener("pointerdown", this.onDown);
    surface.addEventListener("pointerup", this.onUp);
    surface.addEventListener("pointercancel", this.onCancel);
    surface.addEventListener("pointerleave", this.onLeave);
    surface.addEventListener("contextmenu", this.onContextMenu);
    surface.addEventListener("wheel", this.onWheel, { passive: false });
  }

  detach(): void {
    const { surface } = this.setup;
    surface.removeEventListener("pointermove", this.onMove);
    surface.removeEventListener("pointerdown", this.onDown);
    surface.removeEventListener("pointerup", this.onUp);
    surface.removeEventListener("pointercancel", this.onCancel);
    surface.removeEventListener("pointerleave", this.onLeave);
    surface.removeEventListener("contextmenu", this.onContextMenu);
    surface.removeEventListener("wheel", this.onWheel);
  }

  private styleOf(event: PointerEvent): PointerStyle {
    return this.styles[event.pointerType] ?? this.mouse;
  }

  private readonly onMove = (event: PointerEvent): void => this.styleOf(event).move(event);
  private readonly onDown = (event: PointerEvent): void => this.styleOf(event).down(event);
  private readonly onUp = (event: PointerEvent): void => this.styleOf(event).up(event);
  private readonly onCancel = (event: PointerEvent): void => this.styleOf(event).cancel(event);

  private press(event: PointerEvent): void {
    if (event.button === MAIN_BUTTON) this.act(event);
  }

  /** A boat steered past the edge of the sea heads for the edge, rather than stopping dead. */
  private lead(at: ScreenPosition): void {
    const point = this.setup.picker.nearestRomPoint(at);
    if (point === "outside") this.setup.steerer.release();
    else this.setup.steerer.aim(point);
  }

  private act(at: ScreenPosition): void {
    const point = this.setup.picker.romPointAt(at);
    const anchor = { x: at.clientX, y: at.clientY };
    if (point !== "outside") this.setup.steerer.click({ point, anchor });
  }

  private readonly onLeave = (): void => {
    this.setup.steerer.release();
  };

  /** The wheel, or a trackpad's pinch, zooms the view in and out. */
  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setup.view.zoomBy(Math.exp(-event.deltaY * ZOOM_PER_WHEEL_UNIT));
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
    this.setup.controller.pressKeypad("clear");
  };
}
