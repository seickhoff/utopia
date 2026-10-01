import { DISC_RELEASED } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { thumbstick } from "../src/input/thumbstick.js";

const NORTH = 0;
const NORTH_NORTH_EAST = 1;
const NORTH_EAST = 2;

describe("the thumbstick", () => {
  it("drives north for a finger dragged up the board, wherever it landed", () => {
    expect(thumbstick({ reach: 60, way: { x: 0, y: -60 }, held: DISC_RELEASED })).toBe(NORTH);
  });

  it("drives the way the drag runs across the board, however the view slants it", () => {
    const slantedAlongTheBoard = { x: 2, y: -2 };

    expect(thumbstick({ reach: 60, way: slantedAlongTheBoard, held: DISC_RELEASED })).toBe(
      NORTH_EAST,
    );
  });

  it("lets go while the finger is back about where it landed", () => {
    expect(thumbstick({ reach: 5, way: { x: 4, y: -3 }, held: NORTH })).toBe(DISC_RELEASED);
  });

  it("holds its heading while the finger wavers at the edge of the next", () => {
    const wavering = { reach: 62, way: { x: 16, y: -60 } };

    expect([
      thumbstick({ ...wavering, held: NORTH }),
      thumbstick({ ...wavering, held: DISC_RELEASED }),
    ]).toEqual([NORTH, NORTH_NORTH_EAST]);
  });
});
