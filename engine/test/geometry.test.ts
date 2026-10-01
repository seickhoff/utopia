import { describe, expect, it } from "vitest";
import { DISC_RELEASED, discSense, discVelocity, steerToward } from "../src/geometry/disc.js";
import { PixelPoint, squareAnchor, squareUnder } from "../src/geometry/pixel-point.js";
import { NEIGHBOUR_OFFSETS, Square } from "../src/geometry/square.js";

describe("Square", () => {
  it("numbers squares across the grid, 20 to a row", () => {
    expect(Square.at(4, 18).offset).toBe(0x62);
  });

  it("is the same object for the same square", () => {
    expect(Square.fromOffset(0x7a)).toBe(Square.at(6, 2));
  });

  it("knows the status row is not sea", () => {
    expect([Square.at(10, 5).isSea(), Square.at(11, 5).isSea()]).toEqual([true, false]);
  });

  it("is off the grid past its last card", () => {
    expect(Square.fromOffset(240).isOnGrid()).toBe(false);
  });

  it("looks round a square east, south-west, south, south-east, then the other way", () => {
    expect(NEIGHBOUR_OFFSETS).toEqual([1, 19, 20, 21, -1, -19, -20, -21]);
  });
});

describe("squareUnder", () => {
  it("finds the card under the centre of an 8x8 sprite", () => {
    expect(squareUnder(new PixelPoint(42, 78))).toBe(Square.at(9, 4));
  });

  it("puts the right player's cursor start beside the right island", () => {
    expect(squareUnder(new PixelPoint(142, 28))).toBe(Square.at(3, 17));
  });

  it("anchors a sprite exactly over a square", () => {
    expect(squareUnder(squareAnchor(Square.at(5, 7)))).toBe(Square.at(5, 7));
  });
});

describe("discVelocity", () => {
  it("heads north for direction 0", () => {
    expect(discVelocity(0, 15)).toEqual({ x: 0, y: -15 });
  });

  it("heads east for direction 4", () => {
    expect(discVelocity(4, 10)).toEqual({ x: 10, y: 0 });
  });

  it("splits a diagonal between the axes", () => {
    expect(discVelocity(6, 15)).toEqual({ x: 11, y: 11 });
  });

  it("stops when the disc is released", () => {
    expect(discVelocity(DISC_RELEASED, 15)).toEqual({ x: 0, y: 0 });
  });
});

describe("discSense", () => {
  it("drives along one axis when the disc points straight, and both when it slants", () => {
    const EAST = 4;
    const EAST_SOUTH_EAST = 5;

    expect([discSense(EAST), discSense(EAST_SOUTH_EAST)]).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
  });
});

describe("steerToward", () => {
  it("presses toward the target", () => {
    expect(steerToward(new PixelPoint(40, 40), new PixelPoint(80, 40))).toBe(4);
  });

  it("picks the nearest of sixteen directions", () => {
    expect(steerToward(new PixelPoint(40, 40), new PixelPoint(80, 20))).toBe(3);
  });

  it("lets go on arrival", () => {
    expect(steerToward(new PixelPoint(40, 40), new PixelPoint(41, 39))).toBe(DISC_RELEASED);
  });

  it("keeps pressing until within a pixel", () => {
    expect(steerToward(new PixelPoint(40, 40), new PixelPoint(42, 40))).toBe(4);
  });
});
