import { PixelPoint, type Side } from "@utopia/engine";
import type { GameFrame } from "../session/game-session.js";
import { ClassicPixels, FRAME_HEIGHT, FRAME_WIDTH, composeFrame } from "./pixel-frame.js";
import { pixelScale, shownSize, type Area } from "./pixel-scale.js";
import {
  BORDER,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  composeBorder,
  screenLabels,
  type LabelScene,
} from "./screen.js";
import type { Readouts } from "./status-row.js";

/** Where a pointer is on the page. */
export interface ScreenPosition {
  readonly clientX: number;
  readonly clientY: number;
}

/** Each background pixel is drawn as two scanlines. */
const SCANLINES_PER_PIXEL = 2;
/** Sprite coordinates start 8 pixels up and left of the playfield; a sprite's centre is 4 in. */
const TO_SPRITE_CORNER = 8 - 4;

/** Whether the border names the screen's numbers and says whose island is whose. */
type LabelSetting = "on" | "off";

export interface ClassicViewSetup {
  readonly canvas: HTMLCanvasElement;
  /** The room left for the screen beside the bars. */
  readonly room: () => Area;
  /** What each corner of the status bar shows while side buttons are held. */
  readonly readouts: () => Readouts;
  readonly labels: () => LabelSetting;
  /** Each island's governor, whom the labels name above it. */
  readonly names: () => Readonly<Record<Side, string>>;
}

/**
 * The game as the Intellivision drew it, border and all: a humble view that puts the composed
 * picture on a canvas, scaled up without smoothing to fill the room it is given.
 */
export class ClassicView {
  private readonly pixels = new ClassicPixels();
  private readonly playfield: ImageData;
  private readonly context: CanvasRenderingContext2D;
  /** What the border last said, so it is painted again only when that changes. */
  private borderShown = "unpainted";

  constructor(private readonly setup: ClassicViewSetup) {
    setup.canvas.width = SCREEN_WIDTH;
    setup.canvas.height = SCREEN_HEIGHT;
    const context = setup.canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot draw on a canvas");
    this.context = context;
    this.playfield = context.createImageData(FRAME_WIDTH, FRAME_HEIGHT);
    this.resize();
  }

  draw(frame: GameFrame): void {
    const readouts = this.setup.readouts();
    const { phase } = frame.current;
    this.paintBorder({ names: this.setup.names(), readouts, labels: this.setup.labels(), phase });
    composeFrame({ snapshot: frame.current, readouts }, this.pixels);
    new Uint32Array(this.playfield.data.buffer).set(this.pixels.pixels);
    this.context.putImageData(this.playfield, BORDER.across, BORDER.down);
  }

  /**
   * The border changes only when the labels are turned on or off, a side button is held, or the
   * year ends or play resumes.
   */
  private paintBorder(scene: LabelScene): void {
    const { labels, readouts, names, phase } = scene;
    const said = [labels, readouts.left, readouts.right, names.left, names.right, phase].join(":");
    if (said === this.borderShown) return;
    this.borderShown = said;
    const image = this.context.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    new Uint32Array(image.data.buffer).set(composeBorder(screenLabels(scene)));
    this.context.putImageData(image, 0, 0);
  }

  /**
   * The sprite point a pointer at this screen position stands for, placed so an 8x8 sprite there
   * is centred under the pointer; "outside" off the playfield, the border included.
   */
  romPointAt(position: ScreenPosition): PixelPoint | "outside" {
    const screen = this.setup.canvas.getBoundingClientRect();
    const across = ((position.clientX - screen.left) / screen.width) * SCREEN_WIDTH;
    const down = ((position.clientY - screen.top) / screen.height) * SCREEN_HEIGHT;
    const x = across - BORDER.across;
    const y = (down - BORDER.down) / SCANLINES_PER_PIXEL;
    if (x < 0 || y < 0 || x >= FRAME_WIDTH || y >= FRAME_HEIGHT / SCANLINES_PER_PIXEL) {
      return "outside";
    }
    return new PixelPoint(Math.floor(x) + TO_SPRITE_CORNER, Math.floor(y) + TO_SPRITE_CORNER);
  }

  /** The classic screen is exactly the playfield, so there is no edge to be just past. */
  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside" {
    return this.romPointAt(position);
  }

  /** The classic screen leaves the mouse to the system pointer, as the cartridge had none. */
  trackPointer(): void {}

  losePointer(): void {}

  show(): void {
    this.setup.canvas.hidden = false;
    this.borderShown = "unpainted";
    this.resize();
  }

  hide(): void {
    this.setup.canvas.hidden = true;
  }

  resize(): void {
    const size = shownSize(pixelScale(this.setup.room()));
    this.setup.canvas.style.width = `${size.width}px`;
    this.setup.canvas.style.height = `${size.height}px`;
  }
}
