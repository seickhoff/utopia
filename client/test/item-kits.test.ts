import { describe, expect, it } from "vitest";
import {
  CROSS_BAR,
  CURSOR_BAND,
  cursorFrame,
  landfill,
  pointerCross,
} from "../src/scene/item-kits.js";
import { patch, placed, rgb, type Triangles } from "../src/scene/shapes.js";

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

/** Each triangle's area seen from above, signed: positive where it faces the sky. */
function areasFromAbove(model: Triangles): number[] {
  return Array.from({ length: model.positions.length / 9 }, (_, triangle) => {
    const at = (corner: number, axis: number) =>
      model.positions[(triangle * 3 + corner) * 3 + axis];
    const [ux, uz] = [at(1, 0) - at(0, 0), at(1, 2) - at(0, 2)];
    const [vx, vz] = [at(2, 0) - at(0, 0), at(2, 2) - at(0, 2)];
    return (uz * vx - ux * vz) / 2;
  });
}

describe("cursorFrame", () => {
  const GREEN = rgb("#43c275");
  const frame = cursorFrame({ accent: GREEN });
  const areas = areasFromAbove(frame);

  it("reaches across a whole square both ways, as the cartridge's cursor does", () => {
    expect([reach(frame, 0), reach(frame, 2)]).toEqual([1, 1]);
  });

  it("is one hollow square, its top a single band with no part lying over another", () => {
    const top = areas.filter((area) => area > 1e-12).reduce((sum, area) => sum + area, 0);

    expect(top).toBeCloseTo(1 - (1 - 2 * CURSOR_BAND) ** 2, 9);
  });

  it("draws its sides before its top, so drawn over everything it never shows a side across it", () => {
    const firstTop = areas.findIndex((area) => area > 1e-12);

    expect(areas.slice(firstTop).every((area) => area > 1e-12)).toBe(true);
  });

  it("is cut along each side, so it can bend over the land beneath it", () => {
    const xs = new Set(
      frame.positions.filter((_, index) => index % 3 === 0).map((x) => x.toFixed(6)),
    );

    expect(xs.size).toBeGreaterThan(8);
  });
});

describe("pointerCross", () => {
  const GREEN = rgb("#43c275");

  it("reaches a quarter of the way across a square both ways: crosshairs, not a cursor", () => {
    const cross = pointerCross({ accent: GREEN });

    expect([reach(cross, 0), reach(cross, 2)]).toEqual([0.25, 0.25]);
  });

  it("is one solid piece, its top a single plus with no part lying over another", () => {
    const areas = areasFromAbove(pointerCross({ accent: GREEN }));
    const top = areas.filter((area) => area > 1e-12).reduce((sum, area) => sum + area, 0);

    expect(top).toBeCloseTo(2 * 0.25 * CROSS_BAR - CROSS_BAR ** 2, 9);
  });

  it("draws its sides before its top, so drawn over everything it never shows a side across it", () => {
    const areas = areasFromAbove(pointerCross({ accent: GREEN }));
    const firstTop = areas.findIndex((area) => area > 1e-12);

    expect([firstTop > 0, areas.slice(firstTop).every((area) => area > 1e-12)]).toEqual([
      true,
      true,
    ]);
  });

  it("is in the governor's colour, as the cursor is", () => {
    const { colors } = pointerCross({ accent: GREEN });

    expect(new Set(colors)).toEqual(new Set(GREEN));
  });
});

describe("shapes", () => {
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
