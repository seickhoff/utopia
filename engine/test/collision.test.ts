import { describe, expect, it } from "vitest";
import { Board } from "../src/board/board.js";
import { footprintsTouch, touchesForeground } from "../src/collision/overlap.js";
import { Playfield } from "../src/collision/playfield.js";
import { scanlineMask, type Footprint, type SpriteShape } from "../src/collision/sprite-shape.js";
import { Square } from "../src/geometry/square.js";
import { bitRows } from "../src/rom/bitmap.js";

const BLOCK: SpriteShape = { rows: new Array(8).fill(0xff), scanlinesPerRow: 2, pixelsPerBit: 1 };
const DOT: SpriteShape = { rows: [0x80, 0, 0, 0, 0, 0, 0, 0], scanlinesPerRow: 2, pixelsPerBit: 1 };
const placed = (shape: SpriteShape, x: number, y: number, mirrored = false): Footprint => ({
  x,
  y,
  shape,
  mirrored,
});

describe("bitRows", () => {
  it("reads a picture row with the leftmost pixel in bit 7", () => {
    expect(bitRows("#......#/.#......")).toEqual([0x81, 0x40]);
  });
});

describe("scanlineMask", () => {
  it("puts an 8-pixel row in the top byte", () => {
    expect(scanlineMask(placed(DOT, 0, 0), 0)).toBe(0x8000);
  });

  it("mirrors a sprite that faces left", () => {
    expect(scanlineMask(placed(DOT, 0, 0, true), 0)).toBe(0x0100);
  });

  it("doubles each pixel of a double-width sprite", () => {
    const wide: SpriteShape = { ...DOT, pixelsPerBit: 2 };

    expect(scanlineMask(placed(wide, 0, 0), 0)).toBe(0xc000);
  });

  it("repeats a row over its scanlines", () => {
    expect(scanlineMask(placed(DOT, 0, 0), 1)).toBe(0x8000);
  });
});

describe("footprintsTouch", () => {
  it("finds overlapping pixels", () => {
    expect(footprintsTouch(placed(BLOCK, 40, 40), placed(BLOCK, 47, 47))).toBe(true);
  });

  it("finds no touch between sprites side by side", () => {
    expect(footprintsTouch(placed(BLOCK, 40, 40), placed(BLOCK, 48, 40))).toBe(false);
  });

  it("looks at lit pixels, not boxes", () => {
    expect(footprintsTouch(placed(DOT, 40, 40), placed(DOT, 41, 40))).toBe(false);
  });

  it("ignores touches off the screen", () => {
    expect(footprintsTouch(placed(BLOCK, 0, 40), placed(BLOCK, 2, 40))).toBe(false);
  });
});

describe("Playfield", () => {
  it("shows solid land as foreground", () => {
    const playfield = Playfield.of(new Board());

    expect(playfield.isForeground({ x: 8 * 2 + 3, y: 8 * 3 + 3 })).toBe(true);
  });

  it("shows open water as background", () => {
    expect(Playfield.of(new Board()).isForeground({ x: 0, y: 0 })).toBe(false);
  });

  it("shows a built square only through its item's pixels", () => {
    const board = new Board();
    board.build(Square.at(3, 2), "school");
    const playfield = Playfield.of(board);

    expect([
      playfield.isForeground({ x: 16, y: 24 }),
      playfield.isForeground({ x: 16, y: 25 }),
    ]).toEqual([false, true]);
  });

  it("shows an anchored boat's pixels", () => {
    const board = new Board();
    board.anchor(Square.at(9, 9), { side: "left", boat: "fishingBoat" });

    expect(Playfield.of(board).isForeground({ x: 72, y: 76 })).toBe(true);
  });
});

describe("touchesForeground", () => {
  it("finds a sprite over land", () => {
    expect(touchesForeground(placed(BLOCK, 24, 32), Playfield.of(new Board()))).toBe(true);
  });

  it("finds a sprite over open water touching nothing", () => {
    expect(touchesForeground(placed(BLOCK, 8, 8), Playfield.of(new Board()))).toBe(false);
  });
});
