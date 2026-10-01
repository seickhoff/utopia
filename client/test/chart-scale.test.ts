import { describe, expect, it } from "vitest";
import {
  linePath,
  nearestIndex,
  niceCeiling,
  plotterFor,
  rangeOf,
  ticksOf,
} from "../src/hud/chart-scale.js";

const SIZE = { width: 130, height: 50 };

describe("a chart's scale", () => {
  it("rounds a chart's top up to a clean 1, 2 or 5", () => {
    expect([3, 7, 23, 120, 2000].map(niceCeiling)).toEqual([5, 10, 50, 200, 2000]);
  });

  it("keeps room above zero when there is nothing to show", () => {
    expect(rangeOf([0, 0])).toEqual({ low: 0, high: 1 });
  });

  it("runs from zero up, or below zero for a figure that falls", () => {
    expect([rangeOf([3, 9]), rangeOf([-3, 4]), rangeOf([-3, -1])]).toEqual([
      { low: 0, high: 10 },
      { low: -5, high: 5 },
      { low: -5, high: 0 },
    ]);
  });

  it("rules the top, zero, and the bottom when it falls below zero", () => {
    expect([ticksOf({ low: 0, high: 10 }), ticksOf({ low: -5, high: 5 })]).toEqual([
      [10, 0],
      [5, 0, -5],
    ]);
  });
});

describe("plotting a chart", () => {
  const plot = plotterFor({ size: SIZE, count: 3, range: { low: 0, high: 10 } });

  it("spreads the years evenly across the plot, first to last", () => {
    expect([0, 1, 2].map(plot.x)).toEqual([4, 54, 104]);
  });

  it("stands the highest value at the top of the plot and zero at its foot", () => {
    expect([plot.y(10), plot.y(0)]).toEqual([5, 45]);
  });

  it("puts a lone year at the start of the plot", () => {
    const lone = plotterFor({ size: SIZE, count: 1, range: { low: 0, high: 1 } });

    expect(lone.x(0)).toBe(4);
  });

  it("finds the year nearest a pointer", () => {
    expect(nearestIndex([4, 54, 104], 70)).toBe(1);
  });

  it("draws a line through the points", () => {
    expect(
      linePath([
        { x: 4, y: 45 },
        { x: 54.25, y: 5 },
      ]),
    ).toBe("M4 45L54.3 5");
  });
});
