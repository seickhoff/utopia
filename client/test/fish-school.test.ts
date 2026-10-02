import { describe, expect, it } from "vitest";
import { FISH_PER_SCHOOL, fishModel, schoolsOfFish } from "../src/scene/fish-school.js";

describe("fishModel", () => {
  const fish = fishModel();
  const xs = fish.positions.filter((_, index) => index % 3 === 0);

  it("points its nose ahead and fans its tail fin out behind", () => {
    const tail = fish.positions.filter(
      (_, index) => index % 3 === 2 && fish.positions[index - 2] < -0.4,
    );

    expect([Math.max(...xs), Math.min(...xs), Math.max(...tail.map(Math.abs)) > 0.1]).toEqual([
      0.5,
      -0.5,
      true,
    ]);
  });

  it("darkens its back and silvers its flanks", () => {
    expect([Math.min(...fish.shine), Math.max(...fish.shine), fish.shine.length]).toEqual([
      0,
      1,
      fish.positions.length / 3,
    ]);
  });
});

describe("schoolsOfFish", () => {
  const schools = schoolsOfFish(2);
  const fish = Array.from({ length: schools.length / 4 }, (_, index) =>
    schools.slice(index * 4, index * 4 + 4),
  );

  it("fills each school with twice the twenty-four fish it had", () => {
    expect([FISH_PER_SCHOOL, fish.filter((each) => each[0] === 1).length]).toEqual([48, 48]);
  });

  it("gives every fish a number of its own, some swimming shallow and some deep", () => {
    const depths = fish.map((each) => each[2]);

    expect([
      new Set(fish.map((each) => each[1])).size,
      Math.min(...depths) < 0.05,
      Math.max(...depths) > 0.95,
    ]).toEqual([fish.length, true, true]);
  });
});
