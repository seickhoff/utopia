import { DISC_RELEASED } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { discFromArrows } from "../src/input/key-disc.js";
import { NO_COMMAND, commandForKey, type Arrow } from "../src/input/key-map.js";

const stroke = (code: string, shiftKey = false) => commandForKey({ code, shiftKey });

describe("commandForKey", () => {
  it("keys an item with a digit", () => {
    expect(stroke("Digit4")).toEqual({ kind: "keypad", key: 4 });
  });

  it("keys an item from the number pad too", () => {
    expect(stroke("Numpad9")).toEqual({ kind: "keypad", key: 9 });
  });

  it("buys an item at once with Shift and its digit", () => {
    expect(stroke("Digit3", true)).toEqual({ kind: "quickBuy", key: 3 });
  });

  it("buys with Enter", () => {
    expect(stroke("Enter")).toEqual({ kind: "keypad", key: "enter" });
  });

  it("clears with Backspace or Delete", () => {
    expect([stroke("Backspace"), stroke("Delete")]).toEqual([
      { kind: "keypad", key: "clear" },
      { kind: "keypad", key: "clear" },
    ]);
  });

  it("leaves Escape to pause the game", () => {
    expect(stroke("Escape")).toBe(NO_COMMAND);
  });

  it("takes out or anchors a boat with 0 or the space bar", () => {
    expect([stroke("Digit0"), stroke("Space")]).toEqual([
      { kind: "keypad", key: 0 },
      { kind: "keypad", key: 0 },
    ]);
  });

  it("steers with the arrows or WASD", () => {
    expect([stroke("ArrowLeft"), stroke("KeyW")]).toEqual([
      { kind: "arrow", arrow: "left" },
      { kind: "arrow", arrow: "up" },
    ]);
  });

  it("holds the TOTAL, CENSUS and ROUND side buttons on T, C and R", () => {
    expect(["KeyT", "KeyC", "KeyR"].map((code) => stroke(code))).toEqual([
      { kind: "sideButton", button: "total" },
      { kind: "sideButton", button: "census" },
      { kind: "sideButton", button: "round" },
    ]);
  });

  it("ignores other keys", () => {
    expect(stroke("KeyQ")).toBe(NO_COMMAND);
  });
});

describe("discFromArrows", () => {
  const disc = (...arrows: Arrow[]) => discFromArrows(new Set(arrows));

  it("points the disc the way an arrow does", () => {
    expect([disc("up"), disc("right"), disc("down"), disc("left")]).toEqual([0, 4, 8, 12]);
  });

  it("points between two arrows held together", () => {
    expect([disc("up", "right"), disc("down", "left")]).toEqual([2, 10]);
  });

  it("lets go of the disc when no arrow is held", () => {
    expect(disc()).toBe(DISC_RELEASED);
  });

  it("cancels opposite arrows", () => {
    expect(disc("left", "right")).toBe(DISC_RELEASED);
  });
});
