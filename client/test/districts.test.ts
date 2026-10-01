import { describe, expect, it } from "vitest";
import type { District } from "../src/scene/districts/district.js";
import { DEVELOPED_KINDS, districtOf } from "../src/scene/districts/districts.js";
import { rgb, type Triangles } from "../src/scene/shapes.js";

const STYLE = { accent: rgb("#43c275") };
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

  it("stand every structure on the ground, for it to be fitted to the land there", () => {
    const floating = districts().filter(({ district }) =>
      district.structures.some((structure) => Math.min(...heights(structure)) !== 0),
    );

    expect(floating.map(({ kind }) => kind)).toEqual([]);
  });
});
