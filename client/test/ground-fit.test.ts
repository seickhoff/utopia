import { describe, expect, it } from "vitest";
import {
  FOOTING,
  LANDFILL_HEIGHT,
  SHORE_REACH,
  ashore,
  draped,
  footed,
  footprintOf,
  laid,
  reachesWater,
  standsAshore,
  type GroundReading,
} from "../src/scene/ground-fit.js";
import { box, patch, type Triangles } from "../src/scene/shapes.js";

/** Land rising eastward: 0.1 high at x = 0, a tenth higher for every square east. */
const SLOPE: GroundReading = { heightAt: (at) => 0.1 + at.x * 0.1, shoreDistanceAt: () => 5 };
const SEA: GroundReading = { heightAt: () => -0.4, shoreDistanceAt: () => -20 };
/** A beach just clear of the water, its shore running north to south at x = 0.1. */
const COAST: GroundReading = {
  heightAt: () => 0.01,
  shoreDistanceAt: (at) => (0.1 - at.x) * 8,
};
/** Where on COAST the land's lots stop: just short of the water's edge. */
const LOTS_END = 0.1 - SHORE_REACH / 8;

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

describe("laid", () => {
  it("lifts every corner by the height of the land beneath it", () => {
    const blanket = patch({ width: 1, depth: 1, cuts: 1, top: 0, skirt: 0, colour: [1, 1, 1] });

    expect(heights(laid(blanket, SLOPE))).toEqual(heights(draped(blanket, SLOPE)));
  });

  it("lays a flat model right down on the beach, below the landfill's height", () => {
    const blanket = patch({ width: 1, depth: 1, cuts: 1, top: 0, skirt: 0, colour: [1, 1, 1] });

    expect(new Set(heights(laid(blanket, COAST)))).toEqual(new Set([0.01]));
  });

  it("lays nothing below the sea's surface", () => {
    const blanket = patch({ width: 1, depth: 1, cuts: 1, top: 0, skirt: 0, colour: [1, 1, 1] });

    expect(new Set(heights(laid(blanket, SEA)))).toEqual(new Set([0]));
  });
});

describe("ashore", () => {
  const court = () =>
    patch({ width: 0.6, depth: 0.2, cuts: 6, top: 0.006, skirt: 0.004, colour: [1, 1, 1] });
  const xs = (part: Triangles) => part.positions.filter((_, index) => index % 3 === 0);

  it("cuts a flat model along the shore, keeping what lies on land down to the water's edge", () => {
    const trimmed = ashore(court(), COAST);

    expect([Math.min(...xs(trimmed)), Math.max(...xs(trimmed))].map((x) => x.toFixed(9))).toEqual(
      [-0.3, LOTS_END].map((x) => x.toFixed(9)),
    );
  });

  it("keeps the colour and the facing of everything it keeps", () => {
    const trimmed = ashore(court(), COAST);

    expect([
      trimmed.colors.length === trimmed.positions.length,
      new Set(trimmed.colors),
      upward(court()).length > 0 && upward(trimmed).length > 0,
      downward(trimmed),
    ]).toEqual([true, new Set([1]), true, []]);
  });

  it("keeps a model on dry land just as it was", () => {
    expect(ashore(court(), SLOPE)).toEqual(court());
  });

  it("keeps nothing of a model out at sea", () => {
    expect(ashore(court(), SEA).positions).toEqual([]);
  });
});

/** Each triangle's normal's height, from its winding. */
function normalHeights(part: Triangles): number[] {
  return Array.from({ length: part.positions.length / 9 }, (_, triangle) => {
    const at = (corner: number, axis: number) => part.positions[(triangle * 3 + corner) * 3 + axis];
    const [ux, uz] = [at(1, 0) - at(0, 0), at(1, 2) - at(0, 2)];
    const [vx, vz] = [at(2, 0) - at(0, 0), at(2, 2) - at(0, 2)];
    return uz * vx - ux * vz;
  });
}
const upward = (part: Triangles) => normalHeights(part).filter((up) => up > 1e-12);
const downward = (part: Triangles) => normalHeights(part).filter((up) => up < -1e-12);

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

  it("reaches the walls of a building down by the water into the beach itself", () => {
    const standing = footed(building(), COAST);

    expect([Math.min(...heights(standing)), Math.max(...heights(standing))]).toEqual([
      0.01 - FOOTING,
      LANDFILL_HEIGHT + 0.3,
    ]);
  });
});

describe("standsAshore", () => {
  it("keeps a building right by the water, so long as all of it stands above the water", () => {
    const byTheWater = { centre: { x: 0.05, z: 0 }, width: 0.1, depth: 0.1 };

    expect(standsAshore({ footprint: byTheWater, ground: COAST })).toBe(true);
  });

  it("leaves out a building that would stand partly in the sea", () => {
    const pastTheEdge = { centre: { x: 0.15, z: 0 }, width: 0.1, depth: 0.1 };

    expect(standsAshore({ footprint: pastTheEdge, ground: COAST })).toBe(false);
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
