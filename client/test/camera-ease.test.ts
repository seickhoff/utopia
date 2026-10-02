import { describe, expect, it } from "vitest";
import { CameraEase, type CameraState } from "../src/scene/camera-ease.js";

/** One frame at the 60 fps cap, in milliseconds. */
const FRAME_MS = 1000 / 60;
/** The share of the way the camera goes in one frame, easing at 9 per second. */
const SHARE_OF_A_FRAME = 1 - Math.exp(-9 / 60);

const WHOLE_SEA: CameraState = { pitchDegrees: 40, headingDegrees: 0, zoom: 1, x: 0, z: 0 };
/** Four times closer, looking at a town out on the left island, turned to look at it from the west. */
const CLOSE_UP: CameraState = { pitchDegrees: 40, headingDegrees: 90, zoom: 4, x: -6, z: 2 };

/** A camera at rest showing the whole sea, and a clock to step it by. */
function aCamera() {
  const ease = new CameraEase(WHOLE_SEA);
  let nowMs = 0;
  const stepFor = (frames: number) => {
    for (let frame = 0; frame < frames; frame += 1) {
      nowMs += FRAME_MS;
      ease.step({ goal: CLOSE_UP, nowMs });
    }
  };
  return { ease, stepFor };
}

describe("CameraEase", () => {
  it("starts at rest", () => {
    expect(aCamera().ease.isAtRest()).toBe(true);
  });

  it("is on its way, not at rest, while far from its goal", () => {
    const { ease, stepFor } = aCamera();

    stepFor(1);

    expect(ease.isAtRest()).toBe(false);
  });

  it("comes most of the way to its goal in a quarter second", () => {
    const { ease, stepFor } = aCamera();

    stepFor(15);

    expect(ease.current().zoom).toBeGreaterThan(3.5);
  });

  it("turns round toward its new heading, as it tilts and zooms", () => {
    const { ease, stepFor } = aCamera();

    stepFor(15);

    expect(ease.current().headingDegrees).toBeGreaterThan(80);
  });

  it("comes to rest once it has caught up with its goal", () => {
    const { ease, stepFor } = aCamera();

    stepFor(120);

    expect(ease.isAtRest()).toBe(true);
  });

  it("takes a frame's step after a rest, however long the rest lasted", () => {
    const ease = new CameraEase(WHOLE_SEA);

    ease.step({ goal: CLOSE_UP, nowMs: 60_000 });

    expect(ease.current().x).toBeCloseTo(CLOSE_UP.x * SHARE_OF_A_FRAME);
  });
});
