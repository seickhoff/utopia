import { describe, expect, it } from "vitest";
import {
  hullBand,
  hullDeck,
  hullPlan,
  rod,
  sail,
  type HullSpec,
} from "../src/scene/boat-shapes.js";
import type { Triangles, Vec3 } from "../src/scene/shapes.js";

const WHITE = [1, 1, 1] as const;
const HULL: HullSpec = {
  length: 0.15,
  beam: 0.032,
  bow: 0.4,
  stern: 0.8,
  keel: -0.004,
  deck: 0.013,
  flare: 0.75,
};

function facets(model: Triangles): { normal: Vec3; middle: Vec3 }[] {
  return Array.from({ length: model.positions.length / 9 }, (_, triangle) => {
    const [a, b, c] = [0, 1, 2].map((corner) =>
      model.positions.slice((triangle * 3 + corner) * 3, (triangle * 3 + corner) * 3 + 3),
    );
    const [u, v] = [
      b.map((value, axis) => value - a[axis]),
      c.map((value, axis) => value - a[axis]),
    ];
    return {
      normal: {
        x: u[1] * v[2] - u[2] * v[1],
        y: u[2] * v[0] - u[0] * v[2],
        z: u[0] * v[1] - u[1] * v[0],
      },
      middle: {
        x: (a[0] + b[0] + c[0]) / 3,
        y: (a[1] + b[1] + c[1]) / 3,
        z: (a[2] + b[2] + c[2]) / 3,
      },
    };
  });
}
const outward = (model: Triangles, from: (middle: Vec3) => Vec3) =>
  facets(model).every(({ normal, middle }) => {
    const inside = from(middle);
    return (
      normal.x * (middle.x - inside.x) +
        normal.y * (middle.y - inside.y) +
        normal.z * (middle.z - inside.z) >
      0
    );
  });
const xs = (model: Triangles) => model.positions.filter((_, index) => index % 3 === 0);

describe("hullPlan", () => {
  it("runs from a square stern to a pointed bow", () => {
    const plan = hullPlan({ hull: HULL, height: HULL.deck });
    const sternWidth = Math.max(...plan.filter(([x]) => x === -0.075).map(([, z]) => z)) * 2;

    expect([
      Math.min(...plan.map(([x]) => x)),
      Math.max(...plan.map(([x]) => x)),
      sternWidth.toFixed(4),
    ]).toEqual([-0.075, 0.075, (0.032 * 0.8).toFixed(4)]);
  });

  it("narrows toward the keel, as a hull's flaring sides do", () => {
    const width = (height: number) =>
      Math.max(...hullPlan({ hull: HULL, height }).map(([, z]) => z));

    expect(width(HULL.keel)).toBeLessThan(width(HULL.deck));
  });
});

describe("hullBand", () => {
  it("faces every stretch of the hull's side outward", () => {
    const band = hullBand({ hull: HULL, from: 0, to: HULL.deck, colour: WHITE });

    expect(outward(band, (middle) => ({ x: middle.x * 0.5, y: middle.y, z: 0 }))).toBe(true);
  });
});

describe("hullDeck", () => {
  it("decks the hull over, facing the sky", () => {
    const deck = hullDeck({ hull: HULL, colour: WHITE });

    expect([facets(deck).every(({ normal }) => normal.y > 0), Math.max(...xs(deck))]).toEqual([
      true,
      0.075,
    ]);
  });
});

describe("rod", () => {
  it("runs from one point to another, faced outward all round", () => {
    const from = { x: 0, y: 0, z: 0 };
    const to = { x: 0.1, y: 0.05, z: 0.02 };
    const mast = rod({ from, to, radius: 0.002, sides: 5, colour: WHITE });
    const axis = (middle: Vec3) => {
      const along =
        (middle.x * to.x + middle.y * to.y + middle.z * to.z) / (to.x ** 2 + to.y ** 2 + to.z ** 2);
      return { x: to.x * along, y: to.y * along, z: to.z * along };
    };

    expect([mast.positions.length / 9, outward(mast, axis)]).toEqual([10, true]);
  });
});

describe("sail", () => {
  const yard = { from: { x: 0, y: 0.08, z: -0.03 }, to: { x: 0, y: 0.08, z: 0.03 } };
  const canvas = sail({ yard, drop: 0.04, ragged: 0.5, belly: 0.008, seed: 0.3, colour: WHITE });

  it("hangs below its yard, seen from either side", () => {
    const fore = facets(canvas).filter(({ normal }) => normal.x > 0).length;
    const aft = facets(canvas).filter(({ normal }) => normal.x < 0).length;

    expect([
      fore > 0,
      fore === aft,
      Math.max(...canvas.positions.filter((_, i) => i % 3 === 1)),
    ]).toEqual([true, true, 0.08]);
  });

  it("is torn ragged along its foot", () => {
    const heights = canvas.positions.filter((_, i) => i % 3 === 1 && canvas.positions[i] < 0.079);

    expect(new Set(heights.map((y) => y.toFixed(5))).size).toBeGreaterThan(3);
  });
});
