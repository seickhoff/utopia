import { describe, expect, it } from "vitest";
import { MAP_SIZE, hurricaneMap, hurricaneDensity } from "../src/scene/hurricane-map.js";
import { fbm, hash12, valueNoise } from "../src/scene/noise.js";

describe("noise", () => {
  it("gives every cell its own number from 0 to 1, the same each time", () => {
    const numbers = Array.from({ length: 50 }, (_, cell) => hash12([cell, cell * 0.7]));

    expect([
      numbers.every((value) => value >= 0 && value < 1),
      new Set(numbers).size,
      hash12([3, 4]) === hash12([3, 4]),
    ]).toEqual([true, 50, true]);
  });

  it("drifts smoothly, matching each cell's number at its corner", () => {
    expect([
      valueNoise([2, 5]),
      Math.abs(valueNoise([2.001, 5]) - valueNoise([2, 5])) < 0.01,
    ]).toEqual([hash12([2, 5]), true]);
  });

  it("layers its scales into a number from 0 to 1", () => {
    const layered = Array.from({ length: 200 }, (_, step) => fbm([step * 0.37, step * 0.11]));

    expect(layered.every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});

describe("hurricaneDensity", () => {
  const around = (radius: number) =>
    Array.from({ length: 36 }, (_, step) => {
      const angle = (step / 36) * Math.PI * 2;
      return hurricaneDensity({
        disc: [Math.cos(angle) * radius, Math.sin(angle) * radius],
        seed: 0.4,
      });
    });

  it("leaves its eye clear", () => {
    expect(hurricaneDensity({ disc: [0, 0], seed: 0.4 })).toBeLessThan(0.05);
  });

  it("is densest in the eyewall round the eye", () => {
    expect(Math.min(...around(0.2))).toBeGreaterThan(0.75);
  });

  it("thins out toward its rim", () => {
    expect(Math.max(...around(0.97))).toBeLessThan(Math.min(...around(0.2)));
  });
});

describe("hurricaneMap", () => {
  it("maps the spiral a byte a texel, clear past its rim", () => {
    const map = hurricaneMap(0.4);

    expect([map.length, map[0], map[MAP_SIZE * MAP_SIZE - 1]]).toEqual([MAP_SIZE * MAP_SIZE, 0, 0]);
  });
});
