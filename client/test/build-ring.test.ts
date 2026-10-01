import { describe, expect, it } from "vitest";
import {
  HUB_RADIUS,
  RING_EXTENT,
  RING_RADIUS,
  aimedSlot,
  ringCentre,
  slotOffset,
} from "../src/hud/build-ring.js";

const NINE = 9;
const PAGE = { width: 1200, height: 800 };

describe("slotOffset", () => {
  it("puts the first choice straight above the square", () => {
    const first = slotOffset({ slot: 0, count: NINE });

    expect([Math.round(first.x), Math.round(first.y)]).toEqual([0, -RING_RADIUS]);
  });

  it("goes round clockwise from there", () => {
    const third = slotOffset({ slot: 2, count: NINE });

    expect(third.x > 0 && Math.abs(third.y) < RING_RADIUS).toBe(true);
  });
});

describe("aimedSlot", () => {
  it("picks the choice the pointer heads toward, well short of its tile", () => {
    expect(aimedSlot({ offset: { x: 4, y: -40 }, count: NINE })).toBe(0);
  });

  it("gives each choice the whole wedge of the ring around it", () => {
    const aims = [
      { x: 40, y: 0 },
      { x: -40, y: -10 },
      { x: 2, y: 60 },
    ].map((offset) => aimedSlot({ offset, count: NINE }));

    expect(aims).toEqual([2, 7, 4]);
  });

  it("leaves the middle for changing your mind", () => {
    expect(aimedSlot({ offset: { x: HUB_RADIUS - 2, y: 0 }, count: NINE })).toBe("hub");
  });

  it("reaches no choice far past the ring", () => {
    expect(aimedSlot({ offset: { x: 0, y: -(RING_EXTENT + 60) }, count: NINE })).toBe("beyond");
  });
});

describe("ringCentre", () => {
  it("centres the ring on the click", () => {
    expect(ringCentre({ anchor: { x: 600, y: 400 }, page: PAGE })).toEqual({ x: 600, y: 400 });
  });

  it("keeps the whole ring on the page beside an edge", () => {
    const centre = ringCentre({ anchor: { x: 10, y: 790 }, page: PAGE });

    expect([centre.x >= RING_EXTENT, centre.y <= PAGE.height - RING_EXTENT]).toEqual([true, true]);
  });
});
