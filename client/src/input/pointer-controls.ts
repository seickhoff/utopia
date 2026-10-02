import type { PixelPoint, Way } from "@utopia/engine";
import type { ViewAngle } from "../app/view-angle.js";
import type { ScreenPosition } from "../board/screen-position.js";
import type { HandController } from "./hand-controller.js";
import type { BoardClick, Steerer } from "./steerer.js";
import { thumbstick } from "./thumbstick.js";
import { TouchGestures, reachOf, type Drag } from "./touch-gestures.js";

/** Port for the view that knows which point of the playfield a pointer is over. */
export interface BoardPicker {
  romPointAt(position: ScreenPosition): PixelPoint | "outside";
  /** The same, but a pointer just past the playfield's edge counts as at the nearest point on it. */
  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside";
  /** The way a drag across the glass runs across the board itself, x east and y south. */
  wayAcross(drag: Drag): Way;
  /** The mouse is over the board here: the view may show it on the board itself. */
  trackPointer(position: ScreenPosition): void;
  /** The mouse has left the board, or no longer plays it. */
  losePointer(): void;
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

/** How much closer a turn of the wheel, or a trackpad's pinch, takes the view. */
export function zoomOfWheel(event: WheelEvent): number {
  return Math.exp(-event.deltaY * ZOOM_PER_WHEEL_UNIT);
}

/** How a kind of pointer plays: a mouse or a pen acts as it presses, a finger as it lifts. */
export interface PointerStyle {
  down(event: PointerEvent): void;
  move(event: PointerEvent): void;
  up(event: PointerEvent): void;
  cancel(event: PointerEvent): void;
}

/**
 * The mouse, a pen or fingers on the board. The cursor follows the mouse, a click acts, and a
 * right click clears. A finger taps to act or send the boat, drags to lead the cursor or drive the
 * boat, and two work the 3D camera.
 */
export class PointerControls {
  private readonly mouse: PointerStyle = {
    down: (event) => this.press(event),
    move: (event) => this.hover(event),
    up: () => {},
    cancel: () => {},
  };
  private readonly styles: Readonly<Record<string, PointerStyle>>;

  constructor(private readonly setup: PointerSetup) {
    const fingers = new TouchGestures({
      tap: (at) => this.tap(at),
      drag: (drag) => this.drag(drag),
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
    this.setup.picker.losePointer();
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

  /** The mouse over the board: the view shows where it is, and the cursor or boat follows it. */
  private hover(event: PointerEvent): void {
    this.setup.picker.trackPointer(event);
    this.lead(event);
  }

  /** A boat steered past the edge of the sea heads for the edge, rather than stopping dead. */
  private lead(at: ScreenPosition): void {
    const point = this.setup.picker.nearestRomPoint(at);
    if (point === "outside") this.setup.steerer.release();
    else this.setup.steerer.aim(point);
  }

  private act(at: ScreenPosition): void {
    const click = this.clickAt(at);
    if (click !== "outside") this.setup.steerer.click(click);
  }

  /** A finger tapped: a boat sails there, or drops anchor if the boat itself is tapped. */
  private tap(at: ScreenPosition): void {
    const click = this.clickAt(at);
    if (click !== "outside") this.setup.steerer.tap(click);
  }

  /** The board point under a click or tap, and where on the page it was; "outside" off the board. */
  private clickAt(at: ScreenPosition): BoardClick | "outside" {
    const point = this.setup.picker.romPointAt(at);
    return point === "outside" ? point : { point, anchor: { x: at.clientX, y: at.clientY } };
  }

  /**
   * A finger dragged: a boat is driven, as by a thumbstick, the way the drag runs across the board
   * (not the glass, which the 3D view sees at a slant); the cursor is led.
   */
  private drag(drag: Drag): void {
    const { picker, controller, steerer } = this.setup;
    const push = { reach: reachOf(drag), way: picker.wayAcross(drag) };
    const heading = thumbstick({ ...push, held: controller.heading() });
    steerer.drag({ point: picker.nearestRomPoint(drag.to), heading });
  }

  private readonly onLeave = (): void => {
    this.setup.picker.losePointer();
    this.setup.steerer.release();
  };

  /** The wheel, or a trackpad's pinch, zooms the view in and out. */
  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setup.view.zoomBy(zoomOfWheel(event));
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
    this.setup.controller.pressKeypad("clear");
  };
}
