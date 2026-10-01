import type { PixelPoint, Way } from "@utopia/engine";
import type { ScreenPosition } from "../board/screen-position.js";
import type { ViewMode } from "../settings/game-setup-store.js";
import type { GameFrame } from "../session/game-session.js";

/** A way of drawing the game that can be put away while the other is in use. */
export interface ModeView {
  draw(frame: GameFrame): void;
  resize(): void;
  show(): void;
  hide(): void;
  romPointAt(position: ScreenPosition): PixelPoint | "outside";
  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside";
  /** The way a drag across the glass runs across the board itself, x east and y south. */
  wayAcross(drag: { from: ScreenPosition; to: ScreenPosition }): Way;
  /** The mouse is over the board here: a view may show it on the board itself. */
  trackPointer(position: ScreenPosition): void;
  /** The mouse has left the board, or no longer plays it. */
  losePointer(): void;
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

  romPointAt(position: ScreenPosition): PixelPoint | "outside" {
    return this.views[this.mode].romPointAt(position);
  }

  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside" {
    return this.views[this.mode].nearestRomPoint(position);
  }

  wayAcross(drag: { from: ScreenPosition; to: ScreenPosition }): Way {
    return this.views[this.mode].wayAcross(drag);
  }

  trackPointer(position: ScreenPosition): void {
    this.views[this.mode].trackPointer(position);
  }

  losePointer(): void {
    this.views[this.mode].losePointer();
  }
}
