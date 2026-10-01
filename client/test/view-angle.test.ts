import { describe, expect, it } from "vitest";
import { ViewAngle } from "../src/app/view-angle.js";
import { viewTurnForKey } from "../src/input/view-keys.js";

const anAngle = () => new ViewAngle({ pitchDegrees: 40 });

describe("ViewAngle", () => {
  it("starts at the given tilt, showing the whole sea", () => {
    expect(anAngle().current()).toEqual({ pitchDegrees: 40, zoom: 1 });
  });

  it("tilts no flatter than 10 degrees and no steeper than 80", () => {
    const flat = anAngle();
    const steep = anAngle();

    flat.tiltBy(-90);
    steep.tiltBy(90);

    expect([flat.current().pitchDegrees, steep.current().pitchDegrees]).toEqual([10, 80]);
  });

  it("zooms in up to four times closer, and out no farther than the whole sea", () => {
    const near = anAngle();
    const far = anAngle();

    near.zoomBy(10);
    far.zoomBy(0.1);

    expect([near.current().zoom, far.current().zoom]).toEqual([4, 1]);
  });
});

describe("view keys", () => {
  const turned = (code: string) => {
    const angle = anAngle();
    const turn = viewTurnForKey({ code, shiftKey: false });
    if (turn !== "none") turn.applyTo(angle);
    return angle.current();
  };

  it("tilt toward the horizon with Q, and toward looking straight down with E", () => {
    expect([turned("KeyQ").pitchDegrees < 40, turned("KeyE").pitchDegrees > 40]).toEqual([
      true,
      true,
    ]);
  });

  it("tilt with Page Up and Page Down too", () => {
    expect([turned("PageUp").pitchDegrees < 40, turned("PageDown").pitchDegrees > 40]).toEqual([
      true,
      true,
    ]);
  });

  it("zoom in with the plus key and out with the minus key", () => {
    const outFirst = anAngle();
    outFirst.zoomBy(2);
    const out = viewTurnForKey({ code: "Minus", shiftKey: false });
    if (out !== "none") out.applyTo(outFirst);

    expect([turned("Equal").zoom > 1, outFirst.current().zoom < 2]).toEqual([true, true]);
  });

  it("leave the arrows to steer the cursor and boats", () => {
    expect([
      viewTurnForKey({ code: "ArrowUp", shiftKey: false }),
      viewTurnForKey({ code: "ArrowUp", shiftKey: true }),
    ]).toEqual(["none", "none"]);
  });
});
