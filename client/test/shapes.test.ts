import { describe, expect, it } from "vitest";
import { arc, curve, fan, fence, ribbon, ribbonSkirt, straight } from "../src/scene/path-shapes.js";
import { hipRoof, vaultRoof } from "../src/scene/roof-shapes.js";
import { blob, cone } from "../src/scene/round-shapes.js";
import { box, walls, type Triangles, type Vec3 } from "../src/scene/shapes.js";

const WHITE = [1, 1, 1] as const;
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const count = (model: Triangles) => model.positions.length / 9;

/** Each triangle's normal, from its winding, and its middle. */
function facets(model: Triangles): { normal: Vec3; middle: Vec3 }[] {
  return Array.from({ length: count(model) }, (_, triangle) => {
    const [a, b, c] = [0, 1, 2].map((corner) =>
      model.positions.slice((triangle * 3 + corner) * 3, (triangle * 3 + corner) * 3 + 3),
    );
    const [u, v] = [
      b.map((value, axis) => value - a[axis]),
      c.map((value, axis) => value - a[axis]),
    ];
    const normal = {
      x: u[1] * v[2] - u[2] * v[1],
      y: u[2] * v[0] - u[0] * v[2],
      z: u[0] * v[1] - u[1] * v[0],
    };
    const middle = {
      x: (a[0] + b[0] + c[0]) / 3,
      y: (a[1] + b[1] + c[1]) / 3,
      z: (a[2] + b[2] + c[2]) / 3,
    };
    return { normal, middle };
  });
}

/** Whether every triangle faces away from a point inside the model, as a solid's skin must. */
function facesOutward(model: Triangles, inside: Vec3): boolean {
  return facets(model).every(
    ({ normal, middle }) =>
      normal.x * (middle.x - inside.x) +
        normal.y * (middle.y - inside.y) +
        normal.z * (middle.z - inside.z) >
      0,
  );
}

const facesTheSky = (model: Triangles) => facets(model).every(({ normal }) => normal.y > 0);
const heights = (model: Triangles) => model.positions.filter((_, index) => index % 3 === 1);

describe("box", () => {
  it("is built from the ten triangles that can be seen, leaving out its floor", () => {
    const cube = box({ base: ORIGIN, size: { x: 1, y: 1, z: 1 }, colour: WHITE });

    expect([count(cube), facesOutward(cube, { x: 0, y: 0.5, z: 0 })]).toEqual([10, true]);
  });
});

describe("walls", () => {
  it("stand a box's four sides alone, for a roof to cover", () => {
    const sides = walls({ base: ORIGIN, size: { x: 1, y: 1, z: 1 }, colour: WHITE });

    expect([count(sides), facesOutward(sides, { x: 0, y: 0.5, z: 0 })]).toEqual([8, true]);
  });
});

describe("hipRoof", () => {
  const roof = hipRoof({ base: ORIGIN, size: { x: 0.08, y: 0.03, z: 0.06 }, colour: WHITE });

  it("slopes up from all four eaves", () => {
    expect([count(roof), facesOutward(roof, ORIGIN)]).toEqual([6, true]);
  });

  it("runs its ridge east to west, shorter than the house by the house's depth", () => {
    expect(ridgeOf(roof)).toBeCloseTo(0.08 - 0.06, 9);
  });
});

/** How far the roof's highest corners reach east to west. */
function ridgeOf(roof: Triangles): number {
  const top = Math.max(...heights(roof));
  const xs = roof.positions.filter(
    (_, index) => index % 3 === 0 && roof.positions[index + 1] === top,
  );
  return Math.max(...xs) - Math.min(...xs);
}

describe("vaultRoof", () => {
  const vault = vaultRoof({
    base: ORIGIN,
    size: { x: 0.2, y: 0.05, z: 0.1 },
    colour: WHITE,
    segments: 4,
  });

  it("arches over from its south eaves to its north, closed at both ends", () => {
    expect([count(vault), facesOutward(vault, ORIGIN)]).toEqual([4 * 4, true]);
  });

  it("rises to its height and no higher", () => {
    expect(Math.max(...heights(vault))).toBeCloseTo(0.05, 9);
  });
});

describe("cone", () => {
  it("rises from its rim to a point, a triangle to each side", () => {
    const tent = cone({ base: ORIGIN, radius: 0.05, height: 0.06, sides: 6, colour: WHITE });

    expect([count(tent), facesOutward(tent, { x: 0, y: 0.01, z: 0 })]).toEqual([6, true]);
  });
});

describe("blob", () => {
  it("is pointed above and below, widest at its waist", () => {
    const crown = blob({
      base: ORIGIN,
      radius: 0.03,
      height: 0.05,
      sides: 6,
      colour: WHITE,
      waist: 0.4,
    });

    expect([count(crown), facesOutward(crown, { x: 0, y: 0.02, z: 0 })]).toEqual([12, true]);
  });
});

describe("ribbon", () => {
  const curve = arc({ centre: [0, 0], radius: 0.2, from: 0, to: Math.PI, steps: 6 });

  it("lays a strip along a path facing the sky, a cell to each step", () => {
    const track = ribbon({ path: curve, width: 0.03, top: 0.006, colour: WHITE });

    expect([count(track), facesTheSky(track)]).toEqual([6 * 2, true]);
  });

  it("faces the sky whichever way its path runs", () => {
    const backward = ribbon({ path: [...curve].reverse(), width: 0.03, top: 0.006, colour: WHITE });

    expect(facesTheSky(backward)).toBe(true);
  });

  it("keeps its width round a bend", () => {
    const band = ribbon({ path: curve, width: 0.04, top: 0, colour: WHITE });
    const reaches = band.positions
      .filter((_, index) => index % 3 === 0)
      .map((x, corner) => Math.hypot(x, band.positions[corner * 3 + 2]));

    expect([Math.min(...reaches), Math.max(...reaches)].map((r) => r.toFixed(6))).toEqual(
      [0.18, 0.22].map((r) => r.toFixed(6)),
    );
  });

  it("hangs a skirt from both its edges, each wall facing outward", () => {
    const path = straight({ from: [-0.2, 0], to: [0.2, 0], steps: 2 });
    const skirt = ribbonSkirt({ path, width: 0.04, top: 0.006, colour: WHITE, skirt: 0.004 });

    expect([count(skirt), facesOutward(skirt, ORIGIN)]).toEqual([2 * 2 * 2, true]);
  });
});

describe("straight", () => {
  it("cuts a line into equal steps, both ends included", () => {
    const points = straight({ from: [0, 0], to: [0.3, 0.6], steps: 3 });

    expect(points.map(([x, z]) => [x.toFixed(9), z.toFixed(9)])).toEqual([
      ["0.000000000", "0.000000000"],
      ["0.100000000", "0.200000000"],
      ["0.200000000", "0.400000000"],
      ["0.300000000", "0.600000000"],
    ]);
  });
});

describe("curve", () => {
  const through = [
    [0, 0],
    [0.2, 0.1],
    [0.3, 0.3],
    [0.2, 0.5],
  ] as const;
  const winding = curve({ through, steps: 4 });

  it("winds smoothly through every point it is given, in steps between them", () => {
    const passes = through.every(([x, z]) =>
      winding.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1e-9),
    );

    expect([passes, winding.length]).toEqual([true, (through.length - 1) * 4 + 1]);
  });

  it("bends gently, never doubling back on itself", () => {
    const turns = winding.slice(2).map(([x, z], index) => {
      const [ax, az] = winding[index];
      const [bx, bz] = winding[index + 1];
      const [u, v] = [
        [bx - ax, bz - az],
        [x - bx, z - bz],
      ];
      return Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)));
    });

    expect(Math.max(...turns)).toBeLessThan(Math.PI / 4);
  });
});

describe("arc", () => {
  it("turns from east toward south as its angle grows", () => {
    const quarter = arc({ centre: [1, 1], radius: 1, from: 0, to: Math.PI / 2, steps: 1 });

    expect(quarter.map(([x, z]) => [x.toFixed(9), z.toFixed(9)])).toEqual([
      ["2.000000000", "1.000000000"],
      ["1.000000000", "2.000000000"],
    ]);
  });
});

describe("fan", () => {
  it("spreads a flat wedge out from its middle, facing the sky either way round", () => {
    const wedges = [
      fan({
        centre: [0, 0],
        radius: 0.1,
        from: 0,
        to: Math.PI / 2,
        steps: 4,
        top: 0.006,
        colour: WHITE,
      }),
      fan({
        centre: [0, 0],
        radius: 0.1,
        from: Math.PI / 2,
        to: 0,
        steps: 4,
        top: 0.006,
        colour: WHITE,
      }),
    ];

    expect(wedges.map((wedge) => [count(wedge), facesTheSky(wedge)])).toEqual([
      [4, true],
      [4, true],
    ]);
  });
});

describe("fence", () => {
  it("stands along its path and shows from both sides", () => {
    const path = straight({ from: [-0.2, 0], to: [0.2, 0], steps: 2 });
    const wire = fence({ path, height: 0.02, colour: WHITE });
    const facingSouth = facets(wire).filter(({ normal }) => normal.z > 0).length;

    expect([count(wire), facingSouth, Math.min(...heights(wire))]).toEqual([8, 4, 0]);
  });
});
