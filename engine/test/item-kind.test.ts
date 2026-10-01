import { describe, expect, it } from "vitest";
import { cardOf, colourOf, itemOnKey, keyOf, priceOf } from "../src/board/item-kind.js";

describe("the item catalogue", () => {
  it("numbers items as the keypad overlay does", () => {
    expect([1, 5, 9].map(itemOnKey)).toEqual(["fort", "hospital", "fishingBoat"]);
  });

  it("gives each item back its key", () => {
    expect(keyOf("rebel")).toBe(7);
  });

  it("prices items from the cartridge's table", () => {
    expect(
      (["fort", "factory", "crop", "school", "hospital", "house", "rebel"] as const).map(priceOf),
    ).toEqual([50, 40, 3, 35, 75, 60, 30]);
  });

  it("prices the boats", () => {
    expect([priceOf("ptBoat"), priceOf("fishingBoat")]).toEqual([40, 25]);
  });

  it("colours a hospital red and a house yellow", () => {
    expect([colourOf("hospital"), colourOf("house")]).toEqual([2, 6]);
  });

  it("draws each item on the card numbered like its key", () => {
    expect(cardOf("crop")).toBe(3);
  });
});
