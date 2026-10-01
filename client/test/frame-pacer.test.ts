import { describe, expect, it } from "vitest";
import { FramePacer } from "../src/app/frame-pacer.js";

function rendersOver(seconds: number, refreshHz: number, jitterMs = 0): number {
  const pacer = new FramePacer();
  let renders = 0;
  for (let frame = 0; frame < seconds * refreshHz; frame++) {
    const now = (frame * 1000) / refreshHz + (frame % 2 === 0 ? jitterMs : -jitterMs);
    if (pacer.isDue(now)) {
      pacer.markRendered(now);
      renders += 1;
    }
  }
  return renders;
}

describe("FramePacer", () => {
  it("halves a 120 Hz display down to 60 frames a second", () => {
    expect(rendersOver(2, 120)).toBeGreaterThanOrEqual(119);
    expect(rendersOver(2, 120)).toBeLessThanOrEqual(121);
  });

  it("keeps every frame of a 60 Hz display, even with timing jitter", () => {
    expect(rendersOver(2, 60, 0.6)).toBeGreaterThanOrEqual(119);
  });

  it("averages 60 frames a second on a 144 Hz display", () => {
    expect(rendersOver(4, 144)).toBeGreaterThanOrEqual(236);
    expect(rendersOver(4, 144)).toBeLessThanOrEqual(244);
  });

  it("does not burst to catch up after a long pause", () => {
    const pacer = new FramePacer();
    pacer.markRendered(0);
    pacer.markRendered(5000);

    expect(pacer.isDue(5008)).toBe(false);
  });
});
