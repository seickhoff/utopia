import { describe, expect, it } from "vitest";
import { PALETTE_WORDS, pixelWord } from "../src/art/palette.js";
import { FONT_CHARACTERS, glyphRows } from "../src/art/pixel-font.js";

describe("pixelWord", () => {
  it("packs a colour as ImageData lays it out (R, G, B, A in memory)", () => {
    expect(pixelWord("#102030")).toBe(0xff302010);
  });

  it("has a word for each of the 16 Intellivision colours", () => {
    expect(PALETTE_WORDS).toHaveLength(16);
  });
});

describe("the pixel font", () => {
  it("draws every digit and letter", () => {
    const wanted = [..."0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

    expect(wanted.filter((character) => !FONT_CHARACTERS.includes(character))).toEqual([]);
  });

  it("gives every glyph eight rows of eight pixels", () => {
    const misshapen = FONT_CHARACTERS.filter((character) => {
      const rows = glyphRows(character);
      return rows.length !== 8 || rows.some((row) => row > 0xff);
    });

    expect(misshapen).toEqual([]);
  });

  it("draws each character differently", () => {
    const shapes = new Set(FONT_CHARACTERS.map((character) => glyphRows(character).join(",")));

    expect(shapes.size).toBe(FONT_CHARACTERS.length);
  });

  it("draws lower case as upper case", () => {
    expect(glyphRows("s")).toEqual(glyphRows("S"));
  });

  it("draws characters it lacks as blanks", () => {
    expect(glyphRows("~")).toEqual(glyphRows(" "));
  });
});
