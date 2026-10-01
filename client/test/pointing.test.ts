import { PixelPoint } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import {
  nearestSpritePointAt,
  spritePointAt,
  wayAcrossPlayfield,
} from "../src/classic/pointing.js";
import { BORDER } from "../src/classic/screen.js";

const SCANLINES_PER_PIXEL = 2;

/** A pointer over this pixel of the playfield, as the screen measures it. */
const overPlayfield = (x: number, y: number) => ({
  across: BORDER.across + x,
  down: BORDER.down + y * SCANLINES_PER_PIXEL,
});

describe("pointing at the classic screen", () => {
  it("stands for the sprite point centred under the pointer", () => {
    expect(spritePointAt(overPlayfield(20, 30))).toEqual(new PixelPoint(24, 34));
  });

  it("is off the playfield over the border", () => {
    expect(spritePointAt(overPlayfield(-3, 40))).toBe("outside");
  });

  it("takes a pointer over the border, which looks just like the sea, for the sea's nearest point", () => {
    expect(nearestSpritePointAt(overPlayfield(-3, 40))).toEqual(new PixelPoint(4, 44));
  });

  it("finds the way a drag runs across the playfield, in its pixels, not the screen's scanlines", () => {
    const drag = { from: overPlayfield(10, 10), to: overPlayfield(20, 20) };

    expect(wayAcrossPlayfield(drag)).toEqual({ x: 10, y: 10 });
  });
});
