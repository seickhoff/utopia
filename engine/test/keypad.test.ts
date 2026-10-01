import { describe, expect, it } from "vitest";
import { keypadStep } from "../src/pilots/keypad.js";

describe("the keypad", () => {
  it("selects the item on a digit key", () => {
    expect(keypadStep("none", 4)).toEqual({
      selection: "school",
      action: { kind: "selected", item: "school" },
    });
  });

  it("razzes a second digit and forgets the first", () => {
    expect(keypadStep("school", 6)).toEqual({
      selection: "none",
      action: { kind: "razzed", reason: "selectionPending" },
    });
  });

  it("orders the selected item on Enter", () => {
    expect(keypadStep("house", "enter")).toEqual({
      selection: "none",
      action: { kind: "ordered", item: "house" },
    });
  });

  it("cancels the selection on Clear", () => {
    expect(keypadStep("house", "clear")).toEqual({
      selection: "none",
      action: { kind: "cancelled" },
    });
  });

  it("razzes Enter with nothing selected", () => {
    expect(keypadStep("none", "enter").action).toEqual({
      kind: "razzed",
      reason: "nothingSelected",
    });
  });

  it("razzes Clear with nothing selected", () => {
    expect(keypadStep("none", "clear").action).toEqual({
      kind: "razzed",
      reason: "nothingSelected",
    });
  });

  it("hands key 0 to the boats, keeping any selection", () => {
    expect(keypadStep("crop", 0)).toEqual({ selection: "crop", action: { kind: "boatKey" } });
  });
});
