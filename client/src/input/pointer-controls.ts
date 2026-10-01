import type { PixelPoint } from "@utopia/engine";
import type { ViewAngle } from "../app/view-angle.js";
import type { HandController } from "./hand-controller.js";
import type { Steerer } from "./steerer.js";

/** Where a pointer is on the page. */
export interface ScreenPosition {
  readonly clientX: number;
  readonly clientY: number;
}

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

/** The mouse (or a pen) on the board: the cursor follows it, a click acts, a right click clears. */
export class PointerControls {
  constructor(private readonly setup: PointerSetup) {}

  attach(): void {
    const { surface } = this.setup;
    surface.addEventListener("pointermove", this.onMove);
    surface.addEventListener("pointerdown", this.onDown);
    surface.addEventListener("pointerleave", this.onLeave);
    surface.addEventListener("contextmenu", this.onContextMenu);
    surface.addEventListener("wheel", this.onWheel, { passive: false });
  }

  detach(): void {
    const { surface } = this.setup;
    surface.removeEventListener("pointermove", this.onMove);
    surface.removeEventListener("pointerdown", this.onDown);
    surface.removeEventListener("pointerleave", this.onLeave);
    surface.removeEventListener("contextmenu", this.onContextMenu);
    surface.removeEventListener("wheel", this.onWheel);
  }

  /** A boat steered past the edge of the sea heads for the edge, rather than stopping dead. */
  private readonly onMove = (event: PointerEvent): void => {
    const point = this.setup.picker.nearestRomPoint(event);
    if (point === "outside") this.setup.steerer.release();
    else this.setup.steerer.aim(point);
  };

  private readonly onDown = (event: PointerEvent): void => {
    if (event.button !== MAIN_BUTTON) return;
    const point = this.setup.picker.romPointAt(event);
    const anchor = { x: event.clientX, y: event.clientY };
    if (point !== "outside") this.setup.steerer.click({ point, anchor });
  };

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
