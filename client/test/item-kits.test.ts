import { describe, expect, it } from "vitest";
import { landfill, pointerCross } from "../src/scene/item-kits.js";
import { box, patch, placed, rgb, type Triangles } from "../src/scene/shapes.js";

/** How far a model reaches along one axis: 0 across, 2 deep. */
function reach(model: Triangles, axis: number): number {
  const values = model.positions.filter((_, index) => index % 3 === axis);
  return Math.max(...values) - Math.min(...values);
}

describe("landfill", () => {
  it("fills in a little wider than the footprint it goes under", () => {
    expect(reach(landfill({ width: 0.2, depth: 0.1 }), 0)).toBeCloseTo(0.3, 9);
  });
});

describe("pointerCross", () => {
  const GREEN = rgb("#43c275");

  it("reaches across a whole square both ways, as the cursor does", () => {
    const cross = pointerCross({ accent: GREEN });

    expect([reach(cross, 0), reach(cross, 2)]).toEqual([1, 1]);
  });

  it("is in the governor's colour, as the cursor is", () => {
    const { colors } = pointerCross({ accent: GREEN });

    expect(new Set(colors)).toEqual(new Set(GREEN));
  });
});

describe("shapes", () => {
  it("build a box from twelve triangles", () => {
    const cube = box({ base: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 }, colour: [1, 1, 1] });

    expect(cube.positions.length / 9).toBe(12);
  });

  it("move and turn a model into place", () => {
    const dot = { positions: [1, 0, 0], colors: [0, 0, 0] };

    const moved = placed(dot, { offset: { x: 5, y: 1, z: 0 }, turn: Math.PI / 2 });

    expect(moved.positions.map((value) => Math.round(value * 1000) / 1000)).toEqual([5, 1, 1]);
  });

  it("cut a patch into a grid with a skirt round its edge", () => {
    const cover = patch({ width: 1, depth: 1, cuts: 2, top: 0.1, skirt: 0.1, colour: [1, 1, 1] });

    expect(cover.positions.length / 9).toBe(2 * 2 * 2 + 4 * 2 * 2);
  });

  it("face a patch's top to the sky and its skirt outward", () => {
    const cover = patch({ width: 1, depth: 1, cuts: 1, top: 0.1, skirt: 0.1, colour: [1, 1, 1] });
    const facing = (triangle: number) => {
      const [a, b, c] = [0, 1, 2].map((corner) =>
        cover.positions.slice((triangle * 3 + corner) * 3, (triangle * 3 + corner) * 3 + 3),
      );
      const [u, v] = [
        b.map((value, axis) => value - a[axis]),
        c.map((value, axis) => value - a[axis]),
      ];
      const normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const middle = [0, 1, 2].map((axis) => (a[axis] + b[axis] + c[axis]) / 3);
      return { up: normal[1], outward: normal[0] * middle[0] + normal[2] * middle[2] };
    };

    expect([facing(0).up > 0, [2, 4, 6, 8].every((wall) => facing(wall).outward > 0)]).toEqual([
      true,
      true,
    ]);
  });

  it("turn sRGB colours linear", () => {
    expect(rgb("#ffffff")).toEqual([1, 1, 1]);
  });
});
