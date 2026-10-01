import type { PixelPoint } from "@utopia/engine";
import type { ViewMode } from "../settings/game-setup-store.js";
import type { GameFrame } from "../session/game-session.js";

/** A way of drawing the game that can be put away while the other is in use. */
export interface ModeView {
  draw(frame: GameFrame): void;
  resize(): void;
  show(): void;
  hide(): void;
  romPointAt(position: { clientX: number; clientY: number }): PixelPoint | "outside";
  nearestRomPoint(position: { clientX: number; clientY: number }): PixelPoint | "outside";
}

/** The classic screen or the diorama, one at a time: the other draws nothing until switched to. */
export class ViewSwitch {
  private mode: ViewMode;

  constructor(private readonly views: Readonly<Record<ViewMode, ModeView>>) {
    this.mode = "diorama";
    this.views.classic.hide();
  }

  use(mode: ViewMode): void {
    this.views[this.mode].hide();
    this.mode = mode;
    this.views[mode].show();
  }

  draw(frame: GameFrame): void {
    this.views[this.mode].draw(frame);
  }

  resize(): void {
    this.views[this.mode].resize();
  }

  romPointAt(position: { clientX: number; clientY: number }): PixelPoint | "outside" {
    return this.views[this.mode].romPointAt(position);
  }

  nearestRomPoint(position: { clientX: number; clientY: number }): PixelPoint | "outside" {
    return this.views[this.mode].nearestRomPoint(position);
  }
}
