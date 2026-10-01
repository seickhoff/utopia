import { describe, expect, it } from "vitest";
import { PixelPoint } from "../src/geometry/pixel-point.js";
import { Body } from "../src/sea/body.js";

/** The default scale: 16 fine units (768ths of a pixel) a frame for each unit of velocity. */
const FINE_PER_UNIT = 16;

describe("Body", () => {
  it("stands where it was put", () => {
    const body = Body.at(new PixelPoint(27, 0));

    expect(body.point()).toEqual({ x: 27, y: 0 });
  });

  it("moves a forty-eighth of a pixel a frame for each unit of velocity", () => {
    const body = Body.at(new PixelPoint(10, 10));
    body.setVelocity({ x: 48, y: -96 });

    body.move(FINE_PER_UNIT);

    expect(body.point()).toEqual({ x: 11, y: 8 });
  });

  it("keeps the fractions of a pixel between frames", () => {
    const body = Body.at(new PixelPoint(10, 10));
    body.setVelocity({ x: 24, y: 0 });

    body.move(FINE_PER_UNIT);
    body.move(FINE_PER_UNIT);

    expect(body.point().x).toBe(11);
  });

  it("is nudged east, west, south or north by one unit", () => {
    const body = Body.at(new PixelPoint(0, 0));
    body.setVelocity({ x: 4, y: 5 });

    body.nudge(3);
    body.nudge(0);

    expect(body.velocity()).toEqual({ x: 5, y: 4 });
  });

  it("clamps to bounds", () => {
    const body = Body.at(new PixelPoint(2, 99));

    body.clampTo({ left: 8, top: 8, right: 160, bottom: 88 });

    expect(body.point()).toEqual({ x: 8, y: 88 });
  });
});
