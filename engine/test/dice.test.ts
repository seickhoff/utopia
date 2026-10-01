import { describe, expect, it } from "vitest";
import { FairDice } from "../src/random/dice.js";
import { SeededRandom } from "../src/random/random-source.js";
import { LoadedDice } from "./support/loaded-dice.js";

describe("FairDice", () => {
  it("rolls from 0 to one less than its sides", () => {
    const dice = new FairDice(new SeededRandom(7));

    const faces = new Set(Array.from({ length: 200 }, () => dice.roll(3)));

    expect([...faces].sort()).toEqual([0, 1, 2]);
  });

  it("rolls the same from the same seed", () => {
    const rolls = (seed: number) => {
      const dice = new FairDice(new SeededRandom(seed));
      return Array.from({ length: 10 }, () => dice.roll(100));
    };

    expect(rolls(42)).toEqual(rolls(42));
  });
});

describe("LoadedDice", () => {
  it("rolls what the test scripted for that many sides", () => {
    const dice = new LoadedDice().next(12, 0).next(100, 5);

    expect([dice.roll(100), dice.roll(12)]).toEqual([5, 0]);
  });

  it("rolls high when nothing is scripted", () => {
    expect(new LoadedDice().roll(20)).toBe(19);
  });
});
