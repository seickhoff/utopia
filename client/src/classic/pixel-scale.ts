import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./screen.js";

export interface Area {
  readonly width: number;
  readonly height: number;
}

/** The screen's scanlines are half a pixel tall, so it is shown twice as wide as it is stored. */
const SHOWN_WIDTH = SCREEN_WIDTH * 2;

/** How many screen pixels each stored pixel takes: as many as fill the room, shape kept. */
export function pixelScale(area: Area): number {
  return Math.min(area.width / SHOWN_WIDTH, area.height / SCREEN_HEIGHT);
}

export function shownSize(scale: number): Area {
  return { width: SHOWN_WIDTH * scale, height: SCREEN_HEIGHT * scale };
}
