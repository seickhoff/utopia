import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../src/game/game-rules.js";
import { rebelMovement } from "../src/rebels/rebel-movement.js";

const movement = (previous: number, current: number) =>
  rebelMovement({ previous, current }, DEFAULT_RULES.economy.rebellion);

describe("rebel movement", () => {
  it("raises a rebel when the score drops by 10", () => {
    expect(movement(60, 50)).toBe("rise");
  });

  it("does not react to a drop of 9 in a middling score", () => {
    expect(movement(60, 51)).toBe("none");
  });

  it("disperses a rebel when the score rises by 10", () => {
    expect(movement(20, 30)).toBe("disperse");
  });

  it("raises a rebel for a score below 30", () => {
    expect(movement(25, 29)).toBe("rise");
  });

  it("keeps the peace at a score of 30", () => {
    expect(movement(35, 30)).toBe("none");
  });

  it("disperses a rebel at a score of 70", () => {
    expect(movement(75, 70)).toBe("disperse");
  });

  it("keeps a round-1 score of 10 or more free of rebels, as it rises from 0", () => {
    expect(movement(0, 18)).toBe("disperse");
  });

  it("raises a rebel for a round-1 score below 10", () => {
    expect(movement(0, 5)).toBe("rise");
  });

  it("puts a sharp drop ahead of a high score", () => {
    expect(movement(95, 80)).toBe("rise");
  });
});
