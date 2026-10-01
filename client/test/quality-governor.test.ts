import { describe, expect, it } from "vitest";
import { QualityGovernor } from "../src/app/quality-governor.js";

function run(governor: QualityGovernor, frameMs: number, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += frameMs) governor.recordFrame(frameMs);
}

describe("QualityGovernor", () => {
  it("starts at the top level, capped by the display's own pixel ratio", () => {
    expect(new QualityGovernor({ devicePixelRatio: 2 }).pixelRatio()).toBe(1.5);
    expect(new QualityGovernor({ devicePixelRatio: 1 }).pixelRatio()).toBe(1);
  });

  it("holds its level while frames arrive on time", () => {
    const governor = new QualityGovernor({ devicePixelRatio: 2 });

    run(governor, 16.7, 30);

    expect(governor.pixelRatio()).toBe(1.5);
  });

  it("steps the pixel ratio down while frames run slow", () => {
    const governor = new QualityGovernor({ devicePixelRatio: 2 });

    run(governor, 25, 1.5);
    expect(governor.pixelRatio()).toBe(1.25);

    run(governor, 25, 1.5);
    expect(governor.pixelRatio()).toBe(1);
  });

  it("never drops below its lowest level", () => {
    const governor = new QualityGovernor({ devicePixelRatio: 2 });

    run(governor, 40, 20);

    expect(governor.pixelRatio()).toBe(1);
  });

  it("steps back up after a long run of good frames", () => {
    const governor = new QualityGovernor({ devicePixelRatio: 2 });
    run(governor, 25, 1.5);

    run(governor, 16.7, 16);

    expect(governor.pixelRatio()).toBe(1.5);
  });

  it("waits longer before retrying a level that proved too slow", () => {
    const governor = new QualityGovernor({ devicePixelRatio: 2 });
    run(governor, 25, 1.5);
    run(governor, 16.7, 16);
    run(governor, 25, 0.45);

    run(governor, 16.7, 16);

    expect(governor.pixelRatio()).toBe(1.25);
  });

  it("ignores the long gap after a pause or a hidden tab", () => {
    const governor = new QualityGovernor({ devicePixelRatio: 2 });

    for (let i = 0; i < 200; i++) governor.recordFrame(i % 2 === 0 ? 16.7 : 4000);

    expect(governor.pixelRatio()).toBe(1.5);
  });
});
