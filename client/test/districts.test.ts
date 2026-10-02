import { describe, expect, it } from "vitest";
import type { District } from "../src/scene/districts/district.js";
import { DEVELOPED_KINDS, districtOf } from "../src/scene/districts/districts.js";
import { RUNWAY } from "../src/scene/districts/fort.js";
import { SUBURB_ROOFS } from "../src/scene/districts/housing.js";
import { INFIELD, PLAYING_SURFACES, TRACK } from "../src/scene/districts/sports.js";
import { rgb, type Triangles } from "../src/scene/shapes.js";

const STYLE = { accent: rgb("#43c275") };
/** Every colour a model's corners are painted, each as "r,g,b". */
const colours = (...parts: Triangles[]) =>
  new Set(
    parts.flatMap((part) =>
      Array.from({ length: part.colors.length / 3 }, (_, corner) =>
        part.colors.slice(corner * 3, corner * 3 + 3).join(),
      ),
    ),
  );
/** How far a model reaches along one axis: 0 east to west, 2 north to south. */
const reach = (part: Triangles, axis: number) => {
  const values = part.positions.filter((_, index) => index % 3 === axis);
  return Math.max(...values) - Math.min(...values);
};
const districts = () =>
  DEVELOPED_KINDS.map((kind) => ({ kind, district: districtOf(kind, STYLE) }));
const partsOf = (district: District) => [...district.decals, ...district.structures];
const heights = (part: Triangles) => part.positions.filter((_, index) => index % 3 === 1);
const triangles = (district: District) =>
  partsOf(district).reduce((sum, part) => sum + part.positions.length / 9, 0);

describe("districts", () => {
  it("develop each square as a complex of many buildings, not one block", () => {
    const sparse = districts().filter(({ district }) => district.structures.length < 6);

    expect(sparse.map(({ kind }) => kind)).toEqual([]);
  });

  it("keep every district within its square", () => {
    const sprawling = districts().filter(({ district }) =>
      partsOf(district).some((part) =>
        part.positions.some((value, index) => index % 3 !== 1 && Math.abs(value) > 0.5),
      ),
    );

    expect(sprawling.map(({ kind }) => kind)).toEqual([]);
  });

  it("model every district in 1,000 triangles or fewer", () => {
    const heavy = districts().filter(({ district }) => triangles(district) > 1000);

    expect(heavy.map(({ kind }) => kind)).toEqual([]);
  });

  it("colour every corner", () => {
    const uncoloured = districts().filter(({ district }) =>
      partsOf(district).some((part) => part.colors.length !== part.positions.length),
    );

    expect(uncoloured.map(({ kind }) => kind)).toEqual([]);
  });

  it("lay every decal flat, just above the ground", () => {
    const raised = districts().filter(({ district }) =>
      district.decals.some((decal) => heights(decal).some((y) => y < -0.01 || y > 0.02)),
    );

    expect(raised.map(({ kind }) => kind)).toEqual([]);
  });

  it("build housing as a suburb of at least twenty detached homes", () => {
    const homes = districtOf("house", STYLE).structures.filter((structure) =>
      SUBURB_ROOFS.some((roof) => colours(structure).has(roof.join())),
    );

    expect(homes.length).toBeGreaterThanOrEqual(20);
  });

  it("lay a running track and a baseball diamond on a school's grounds", () => {
    const grounds = colours(...districtOf("school", STYLE).decals);

    expect([grounds.has(TRACK.join()), grounds.has(INFIELD.join())]).toEqual([true, true]);
  });

  it("keep a school's track and ball field well in from its square's edges", () => {
    const surfaces = new Set(PLAYING_SURFACES.map((surface) => surface.join()));
    const fields = districtOf("school", STYLE).decals.filter((decal) =>
      [...colours(decal)].some((shade) => surfaces.has(shade)),
    );
    const furthest = Math.max(
      ...fields.flatMap((field) =>
        field.positions.filter((_, index) => index % 3 !== 1).map(Math.abs),
      ),
    );

    expect(furthest).toBeLessThanOrEqual(0.4);
  });

  it("build a fort as an air base, its runway reaching across the square", () => {
    const runway = districtOf("fort", STYLE).decals.filter((decal) =>
      colours(decal).has(RUNWAY.join()),
    );

    expect(Math.max(...runway.map((strip) => reach(strip, 0)))).toBeGreaterThan(0.8);
  });

  it("give a fort and a rebel camp no colour in common, so neither is taken for the other", () => {
    const fort = colours(...partsOf(districtOf("fort", STYLE)));
    const shared = [...colours(...partsOf(districtOf("rebel", STYLE)))].filter((shade) =>
      fort.has(shade),
    );

    expect(shared).toEqual([]);
  });

  it("raise a factory's smokestacks above everything else in the town", () => {
    const tops = districts().map(({ kind, district }) => ({
      kind,
      top: Math.max(...partsOf(district).flatMap(heights)),
    }));
    const tallest = tops.reduce((highest, next) => (next.top > highest.top ? next : highest));

    expect(tallest.kind).toBe("factory");
  });

  it("stand every structure on the ground, for it to be fitted to the land there", () => {
    const floating = districts().filter(({ district }) =>
      district.structures.some((structure) => Math.min(...heights(structure)) !== 0),
    );

    expect(floating.map(({ kind }) => kind)).toEqual([]);
  });
});
