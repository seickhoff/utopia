import { describe, expect, it } from "vitest";
import { Drape } from "../src/scene/drape.js";
import type { GroundReading } from "../src/scene/ground-fit.js";
import type { Triangles } from "../src/scene/shapes.js";

/** Land rising eastward: 0.1 high at x = 0, a tenth higher for every square east. */
const SLOPE: GroundReading = { heightAt: (at) => 0.1 + at.x * 0.1, shoreDistanceAt: () => 5 };
const SEA: GroundReading = { heightAt: () => -0.4, shoreDistanceAt: () => -20 };
/** A triangle a hair above its floor, round its middle. */
const SLIVER: Triangles = { positions: [-0.5, 0.01, 0, 0.5, 0.01, 0, 0, 0.03, 0.5], colors: [] };

const round = (values: ArrayLike<number>) => Array.from(values, (value) => value.toFixed(6));

describe("Drape", () => {
  it("lays a model round a point, each corner over the ground beneath it", () => {
    const into = new Float32Array(9);

    new Drape(SLIVER, SLOPE).layAt({ centre: { x: 2, z: 1 }, into });

    expect(round(into)).toEqual(
      round([1.5, 0.01 + 0.25, 1, 2.5, 0.01 + 0.35, 1, 2, 0.03 + 0.3, 1.5]),
    );
  });

  it("rides on the water's surface where it lies out at sea", () => {
    const into = new Float32Array(9);

    new Drape(SLIVER, SEA).layAt({ centre: { x: 0, z: 0 }, into });

    expect(round(into)).toEqual(round(SLIVER.positions));
  });
});
