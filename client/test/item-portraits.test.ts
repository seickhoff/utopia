import { ITEM_KINDS } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { portraitModel } from "../src/scene/item-portraits.js";

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

  it("colour every corner", () => {
    const uncoloured = ITEM_KINDS.filter((kind) => {
      const model = portraitModel(kind);
      return model.colors.length !== model.positions.length;
    });

    expect(uncoloured).toEqual([]);
  });
});
