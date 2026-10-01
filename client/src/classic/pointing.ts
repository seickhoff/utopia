import { PixelPoint, type Way } from "@utopia/engine";
import { FRAME_HEIGHT, FRAME_WIDTH } from "./pixel-frame.js";
import { BORDER } from "./screen.js";

/** A point of the classic screen in its own measure: background pixels across, scanlines down. */
export interface ScreenPixel {
  readonly across: number;
  readonly down: number;
}

/** Each background pixel is drawn as two scanlines. */
const SCANLINES_PER_PIXEL = 2;
/** Sprite coordinates start 8 pixels up and left of the playfield; a sprite's centre is 4 in. */
const TO_SPRITE_CORNER = 8 - 4;
const PLAYFIELD = { width: FRAME_WIDTH, height: FRAME_HEIGHT / SCANLINES_PER_PIXEL };

/**
 * The sprite point a pointer here stands for, placed so an 8x8 sprite there is centred under the
 * pointer; "outside" off the playfield, the border included.
 */
export function spritePointAt(pixel: ScreenPixel): PixelPoint | "outside" {
  const { x, y } = playfieldPixelAt(pixel);
  if (x < 0 || y < 0 || x >= PLAYFIELD.width || y >= PLAYFIELD.height) return "outside";
  return spriteOver({ x, y });
}

/**
 * The same, but a pointer over the border stands for the nearest point of the playfield. The
 * cartridge paints its border the blue of the sea, so pointing there looks like pointing at it.
 */
export function nearestSpritePointAt(pixel: ScreenPixel): PixelPoint {
  const { x, y } = playfieldPixelAt(pixel);
  return spriteOver({ x: within(x, PLAYFIELD.width), y: within(y, PLAYFIELD.height) });
}

/** The way a drag across the screen runs across the playfield, in its pixels: x east, y south. */
export function wayAcrossPlayfield(drag: { from: ScreenPixel; to: ScreenPixel }): Way {
  const from = playfieldPixelAt(drag.from);
  const to = playfieldPixelAt(drag.to);
  return { x: to.x - from.x, y: to.y - from.y };
}

function playfieldPixelAt(pixel: ScreenPixel): { x: number; y: number } {
  return {
    x: pixel.across - BORDER.across,
    y: (pixel.down - BORDER.down) / SCANLINES_PER_PIXEL,
  };
}

function spriteOver(pixel: { x: number; y: number }): PixelPoint {
  return new PixelPoint(
    Math.floor(pixel.x) + TO_SPRITE_CORNER,
    Math.floor(pixel.y) + TO_SPRITE_CORNER,
  );
}

/** A pixel's place along one side of the playfield, brought onto it if it lies beyond. */
function within(place: number, size: number): number {
  return Math.min(size - 1, Math.max(0, place));
}
