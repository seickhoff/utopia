import { describe, expect, it } from "vitest";
import {
  FOOTING,
  LANDFILL_HEIGHT,
  draped,
  footed,
  footprintOf,
  reachesWater,
  type GroundReading,
} from "../src/scene/ground-fit.js";
import { box, patch, type Triangles } from "../src/scene/shapes.js";

/** Land rising eastward: 0.1 high at x = 0, a tenth higher for every square east. */
const SLOPE: GroundReading = { heightAt: (at) => 0.1 + at.x * 0.1, shoreDistanceAt: () => 5 };
const SEA: GroundReading = { heightAt: () => -0.4, shoreDistanceAt: () => -20 };

const heights = (part: Triangles) => part.positions.filter((_, index) => index % 3 === 1);
const cornersAt = (part: Triangles, x: number) =>
  heights(part).filter((_, corner) => Math.abs(part.positions[corner * 3] - x) < 1e-9);

/** A unit box standing on the ground, its middle at x = 1. */
const building = () =>
  box({ base: { x: 1, y: 0, z: 0 }, size: { x: 1, y: 0.3, z: 1 }, colour: [1, 1, 1] });

describe("draped", () => {
  it("lifts every corner by the height of the land beneath it", () => {
    const blanket = patch({ width: 1, depth: 1, cuts: 1, top: 0, skirt: 0, colour: [1, 1, 1] });
    const lying = draped(blanket, SLOPE);
    const allAt = (x: number, height: number) =>
      cornersAt(lying, x).every((corner) => Math.abs(corner - height) < 1e-9);

    expect([allAt(-0.5, 0.05), allAt(0.5, 0.15)]).toEqual([true, true]);
  });

  it("lays nothing lower than the landfill, just clear of the sea", () => {
    const blanket = patch({ width: 1, depth: 1, cuts: 1, top: 0, skirt: 0, colour: [1, 1, 1] });

    expect(new Set(heights(draped(blanket, SEA)))).toEqual(new Set([LANDFILL_HEIGHT]));
  });
});

describe("footed", () => {
  it("stands a building level on the highest land beneath it", () => {
    const roof = cornersAt(footed(building(), SLOPE), 1.5).filter((height) => height > 0.4);

    expect(roof.every((height) => Math.abs(height - (0.3 + 0.25)) < 1e-9)).toBe(true);
  });

  it("reaches the foot of each wall down into the ground beneath it", () => {
    const standing = footed(building(), SLOPE);
    const lowest = (x: number) => Math.min(...cornersAt(standing, x));

    expect(lowest(0.5)).toBeCloseTo(0.15 - FOOTING, 9);
    expect(lowest(1.5)).toBeCloseTo(0.25 - FOOTING, 9);
  });
});

const SQUARE = { centre: { x: 0, z: 0 }, width: 0.8, depth: 0.8 };

describe("reachesWater", () => {
  it("finds a footprint that runs down into the sea", () => {
    const coast: GroundReading = {
      heightAt: (at) => (at.x > 0.3 ? -0.1 : 0.2),
      shoreDistanceAt: () => 0,
    };

    expect(reachesWater({ footprint: SQUARE, ground: coast })).toBe(true);
  });

  it("passes over a footprint that is dry land throughout", () => {
    expect(reachesWater({ footprint: SQUARE, ground: SLOPE })).toBe(false);
  });
});

describe("footprintOf", () => {
  it("finds the rectangle a part covers from above", () => {
    const hut = box({
      base: { x: 1, y: 0, z: 2 },
      size: { x: 0.4, y: 0.3, z: 0.2 },
      colour: [1, 1, 1],
    });

    const { centre, width, depth } = footprintOf(hut);

    expect([centre.x, centre.z, width, depth].map((value) => value.toFixed(6))).toEqual([
      "1.000000",
      "2.000000",
      "0.400000",
      "0.200000",
    ]);
  });
});
