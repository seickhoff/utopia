import { ITEM_KINDS } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { CROP_COLOURS } from "../src/scene/crop-glsl.js";
import { portraitModel } from "../src/scene/item-portraits.js";
import { rgb, type Triangles } from "../src/scene/shapes.js";

const colourTriples = (model: Triangles) =>
  new Set(
    Array.from({ length: model.colors.length / 3 }, (_, corner) =>
      model.colors.slice(corner * 3, corner * 3 + 3).join(),
    ),
  );

describe("item portraits", () => {
  it("model every item, boats and crops included, on its own little tile of ground", () => {
    const empty = ITEM_KINDS.filter((kind) => portraitModel(kind).positions.length === 0);

    expect(empty).toEqual([]);
  });

  it("keep every portrait within its tile, so none is cut off", () => {
    const sprawling = ITEM_KINDS.filter((kind) =>
      portraitModel(kind).positions.some(
        (value, index) => index % 3 !== 1 && Math.abs(value) > 0.66,
      ),
    );

    expect(sprawling).toEqual([]);
  });

  it("show crops as a patchwork of fields, each of its own crop", () => {
    const shades = new Set(
      CROP_COLOURS.map((hex) => rgb(hex).join()).filter((shade) =>
        colourTriples(portraitModel("crop")).has(shade),
      ),
    );

    expect(shades.size).toBeGreaterThanOrEqual(3);
  });

  it("colour every corner", () => {
    const uncoloured = ITEM_KINDS.filter((kind) => {
      const model = portraitModel(kind);
      return model.colors.length !== model.positions.length;
    });

    expect(uncoloured).toEqual([]);
  });
});
