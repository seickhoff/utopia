import { describe, expect, it } from "vitest";
import type { District } from "../src/scene/districts/district.js";
import { fittedDistrict } from "../src/scene/district-layout.js";
import { FOOTING, type GroundReading } from "../src/scene/ground-fit.js";
import { landfill } from "../src/scene/item-kits.js";
import { box, patch, type Triangles } from "../src/scene/shapes.js";

const WHITE = [1, 1, 1] as const;
const hut = (x: number): Triangles =>
  box({ base: { x, y: 0, z: 0 }, size: { x: 0.1, y: 0.1, z: 0.1 }, colour: WHITE });
const lot = (x: number): Triangles => ({
  positions: patch({
    width: 0.2,
    depth: 0.2,
    cuts: 2,
    top: 0.006,
    skirt: 0.004,
    colour: WHITE,
  }).positions.map((value, index) => (index % 3 === 0 ? value + x : value)),
  colors: patch({ width: 0.2, depth: 0.2, cuts: 2, top: 0.006, skirt: 0.004, colour: WHITE })
    .colors,
});
const heights = (part: Triangles) => part.positions.filter((_, index) => index % 3 === 1);
const count = (part: Triangles) => part.positions.length / 9;

/** Land rising eastward: 0.2 high at the square's middle. */
const SLOPE: GroundReading = { heightAt: (at) => 0.2 + at.x * 0.1, shoreDistanceAt: () => 5 };
/** Dry land to the west of the middle, sea to the east. */
const COAST: GroundReading = {
  heightAt: (at) => (at.x < 0 ? 0.2 : -0.2),
  shoreDistanceAt: (at) => (at.x < 0 ? 5 : -5),
};
const MIDDLE = { x: 0, z: 0 };

describe("fittedDistrict", () => {
  it("stands each building on the ground beneath it", () => {
    const district: District = { decals: [], structures: [hut(-0.3), hut(0.3)] };

    const fitted = fittedDistrict({ district, centre: MIDDLE, ground: SLOPE });

    expect(Math.min(...heights(fitted))).toBeCloseTo(0.2 - 0.035 - FOOTING, 9);
  });

  it("lays its car parks and courts over the ground, following its slope", () => {
    const district: District = { decals: [lot(0)], structures: [hut(-0.3)] };
    const fitted = fittedDistrict({ district, centre: MIDDLE, ground: SLOPE });
    const decalHeights = heights(fitted).slice(0, heights(lot(0)).length);

    expect([Math.min(...decalHeights), Math.max(...decalHeights)].map((y) => y.toFixed(3))).toEqual(
      [(0.2 - 0.01 - 0.004).toFixed(3), (0.2 + 0.01 + 0.006).toFixed(3)],
    );
  });

  it("leaves out what would stand in the sea, but keeps its landmark on landfill", () => {
    const district: District = { decals: [lot(0.3)], structures: [hut(0.2), hut(0.3), hut(-0.3)] };

    const fitted = fittedDistrict({ district, centre: MIDDLE, ground: COAST });

    const landmarkAndWestHut = count(hut(0)) * 2;
    const fillUnderLandmark = count(landfill({ width: 0.1, depth: 0.1 }));

    expect(count(fitted)).toBe(landmarkAndWestHut + fillUnderLandmark);
  });
});
