import { describe, expect, it } from "vitest";
import { pixelScale, shownSize } from "../src/classic/pixel-scale.js";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../src/classic/screen.js";

describe("pixelScale", () => {
  it("fills the room's height when the room is wider than the screen", () => {
    const room = { width: 3000, height: 900 };

    expect(shownSize(pixelScale(room)).height).toBeCloseTo(900, 5);
  });

  it("fills the room's width when the room is taller than the screen", () => {
    const room = { width: 700, height: 2000 };

    expect(shownSize(pixelScale(room)).width).toBeCloseTo(700, 5);
  });
});

describe("shownSize", () => {
  it("shows the screen twice as wide as it is stored, so pixels come out square", () => {
    expect(shownSize(3)).toEqual({ width: SCREEN_WIDTH * 2 * 3, height: SCREEN_HEIGHT * 3 });
  });
});
