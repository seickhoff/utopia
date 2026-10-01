import { describe, expect, it } from "vitest";
import { DISC_RELEASED, steerToward, type DiscReading } from "../src/geometry/disc.js";
import { PixelPoint, squareAnchor } from "../src/geometry/pixel-point.js";
import { Square } from "../src/geometry/square.js";
import { steerAlong, steerWithin } from "../src/sea/course.js";

const NORTH_EAST = 2;
const WEST = 12;
const EAST = 4;
const EAST_SOUTH_EAST = 5;
const SOUTH_EAST = 6;

const OPEN_SEA = { isShore: () => false };
const HERE = Square.at(9, 2);
const EASTWARD = { from: HERE, to: Square.at(9, 3) };

/** A boat this far from where it would sit to cover the square it is over. */
function aBoatOff(offset: { x: number; y: number }): PixelPoint {
  const anchor = squareAnchor(HERE);
  return new PixelPoint(anchor.x + offset.x, anchor.y + offset.y);
}

describe("steering along a leg", () => {
  it("holds one heading down a straight run of squares", () => {
    const heading = steerAlong(aBoatOff({ x: 0, y: 0 }), {
      passage: EASTWARD,
      shore: OPEN_SEA,
      held: DISC_RELEASED,
    });

    expect(heading).toBe(EAST);
  });

  it("keeps its heading a little off the line, where aiming at the square would turn it", () => {
    const boat = aBoatOff({ x: 2, y: -2 });

    const headings = [
      steerAlong(boat, { passage: EASTWARD, shore: OPEN_SEA, held: DISC_RELEASED }),
      steerToward(boat, squareAnchor(EASTWARD.to)),
    ];

    expect(headings).toEqual([EAST, EAST_SOUTH_EAST]);
  });

  it("turns back toward its line once it has wandered well off it", () => {
    const heading = steerAlong(aBoatOff({ x: 0, y: -5 }), {
      passage: EASTWARD,
      shore: OPEN_SEA,
      held: DISC_RELEASED,
    });

    expect(heading).toBe(EAST_SOUTH_EAST);
  });

  it("never turns toward shore the sand bars would turn it back from", () => {
    const shoreBelow = { isShore: (square: Square) => square === Square.at(10, 2) };

    const heading = steerAlong(aBoatOff({ x: 0, y: -5 }), {
      passage: EASTWARD,
      shore: shoreBelow,
      held: DISC_RELEASED,
    });

    expect(heading).toBe(EAST);
  });

  it("sails a slanting leg at the disc's own slant", () => {
    const northEastward = { from: HERE, to: Square.at(8, 3) };

    const heading = steerAlong(aBoatOff({ x: 0, y: 0 }), {
      passage: northEastward,
      shore: OPEN_SEA,
      held: DISC_RELEASED,
    });

    expect(heading).toBe(NORTH_EAST);
  });

  it("holds the heading it has while the boat hovers at the edge of being off its line", () => {
    const southEastward = { from: HERE, to: Square.at(10, 3) };
    const boat = aBoatOff({ x: -2, y: 3 });
    const steer = (held: DiscReading) =>
      steerAlong(boat, { passage: southEastward, shore: OPEN_SEA, held });

    expect([steer(SOUTH_EAST), steer(DISC_RELEASED)]).toEqual([SOUTH_EAST, EAST_SOUTH_EAST]);
  });

  it("makes for the square it is over when it has nowhere further to go", () => {
    const heading = steerAlong(aBoatOff({ x: 0, y: 0 }), {
      passage: { from: HERE, to: HERE },
      shore: OPEN_SEA,
      held: DISC_RELEASED,
    });

    expect(heading).toBe(DISC_RELEASED);
  });
});

describe("steering within a square", () => {
  it("brings a boat onto a point in the square it is over", () => {
    const target = aBoatOff({ x: 0, y: 0 });

    expect(steerWithin(aBoatOff({ x: 3, y: 0 }), { target, shore: OPEN_SEA })).toBe(WEST);
  });

  it("lets go once the boat is on the point", () => {
    const target = aBoatOff({ x: 0, y: 0 });

    expect(steerWithin(target, { target, shore: OPEN_SEA })).toBe(DISC_RELEASED);
  });

  it("lets go rather than press toward shore the sand bars would turn it back from", () => {
    const shoreBeside = { isShore: (square: Square) => square === HERE.shiftedBy(-1) };

    const heading = steerWithin(aBoatOff({ x: 3, y: 0 }), {
      target: aBoatOff({ x: 0, y: 0 }),
      shore: shoreBeside,
    });

    expect(heading).toBe(DISC_RELEASED);
  });
});
