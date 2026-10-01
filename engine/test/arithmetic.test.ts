import { describe, expect, it } from "vitest";
import { roundedQuotient, truncatedQuotient } from "../src/economy/arithmetic.js";

describe("roundedQuotient (the EXEC's X_DIVR)", () => {
  it("rounds to the nearest whole number", () => {
    expect(roundedQuotient(50, 3)).toBe(17);
  });

  it("rounds down below a half", () => {
    expect(roundedQuotient(50, 12)).toBe(4);
  });

  it("rounds a half up", () => {
    expect(roundedQuotient(5, 2)).toBe(3);
  });

  it("rounds negative quotients symmetrically", () => {
    expect(roundedQuotient(-5, 2)).toBe(-3);
  });

  it("answers 0 when dividing by 0, as the EXEC does", () => {
    expect(roundedQuotient(500, 0)).toBe(0);
  });
});

describe("truncatedQuotient (the EXEC's X_DIV)", () => {
  it("drops the remainder", () => {
    expect(truncatedQuotient(1027, 100)).toBe(10);
  });

  it("rounds toward zero for negative dividends", () => {
    expect(truncatedQuotient(-150, 100)).toBe(-1);
  });

  it("answers 0 when dividing by 0", () => {
    expect(truncatedQuotient(1000, 0)).toBe(0);
  });
});
