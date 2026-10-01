import { describe, expect, it } from "vitest";
import { CLOUD_LOOKS, lightningAt } from "../src/scene/cloud-looks.js";
import { spriteSeed } from "../src/scene/sprite-seed.js";

/** Every brightness a cloud shows over a minute, sampled every hundredth of a second. */
function brightnessOverAMinute(kind: keyof typeof CLOUD_LOOKS): number[] {
  return Array.from(
    { length: 6000 },
    (_, step) =>
      lightningAt({ seconds: step / 100, seed: 0.37, look: CLOUD_LOOKS[kind] }).brightness,
  );
}

describe("lightning", () => {
  it("never lights a rain cloud", () => {
    expect(new Set(brightnessOverAMinute("rain"))).toEqual(new Set([0]));
  });

  it("flashes a storm cloud now and then, dark the rest of the time", () => {
    const brightness = brightnessOverAMinute("storm");
    const lit = brightness.filter((value) => value > 0).length;

    expect([Math.max(...brightness), lit > 60, lit < 600]).toEqual([1, true, true]);
  });

  it("counts its flashes, so each strikes somewhere new", () => {
    const look = CLOUD_LOOKS.storm;
    const flash = (seconds: number) => lightningAt({ seconds, seed: 0.37, look }).flash;

    expect(flash(60)).toBeGreaterThan(flash(0) + 10);
  });
});

describe("spriteSeed", () => {
  it("tells sprites apart, and the same sprite always the same", () => {
    expect([spriteSeed(3) === spriteSeed(3), spriteSeed(3) === spriteSeed(4)]).toEqual([
      true,
      false,
    ]);
  });

  it("stays between 0 and 1", () => {
    const seeds = Array.from({ length: 200 }, (_, id) => spriteSeed(id));

    expect(seeds.every((seed) => seed >= 0 && seed < 1)).toBe(true);
  });
});
