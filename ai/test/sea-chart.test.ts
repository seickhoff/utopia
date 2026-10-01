import { Square } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { SeaChart } from "../src/sea-chart.js";
import { aPosition } from "./support/position.js";

function chart(): SeaChart {
  return SeaChart.of(aPosition().view("left"));
}

describe("the sea chart", () => {
  it("makes straight for a destination next door", () => {
    const next = chart().nextWaypoint({ from: Square.at(9, 9), to: Square.at(9, 10) });

    expect(next).toBe(Square.at(9, 10));
  });

  it("heads for an open-water square next to the boat on a longer passage", () => {
    const from = Square.at(9, 2);
    const next = chart().nextWaypoint({ from, to: Square.at(9, 12) });

    expect([Math.abs(next.row - from.row) <= 1, Math.abs(next.col - from.col) <= 1]).toEqual([
      true,
      true,
    ]);
  });

  it("gets closer with every waypoint", () => {
    const next = chart().nextWaypoint({ from: Square.at(9, 2), to: Square.at(9, 12) });

    expect(next.col).toBe(3);
  });

  it("sails round an island rather than over it", () => {
    const from = Square.at(4, 0);
    const to = Square.at(4, 5);
    const view = aPosition().view("left");
    const passage = voyage({ chart: SeaChart.of(view), from, to });

    expect(passage.every((square) => view.isNavigable(square))).toBe(true);
  });

  it("never cuts the corner of an island", () => {
    const view = aPosition().view("left");
    const passage = voyage({
      chart: SeaChart.of(view),
      from: Square.at(1, 1),
      to: Square.at(6, 7),
    });

    expect(cutsCorners(passage, view)).toEqual([]);
  });

  it("never sails on through a square whose next square along its course is shore", () => {
    const view = aPosition().view("left");
    const passage = voyage({
      chart: SeaChart.of(view),
      from: Square.at(6, 2),
      to: Square.at(4, 6),
    });

    expect(turnedBackBySandBars(passage, view)).toEqual([]);
  });

  it("may end a passage on a square with shore beyond, letting go of the disc there", () => {
    const view = aPosition().view("left");
    const landlockedBay = Square.at(5, 6);

    const passage = voyage({ chart: SeaChart.of(view), from: Square.at(9, 12), to: landlockedBay });

    expect(passage[passage.length - 1]).toBe(landlockedBay);
  });

  it("makes straight for a destination it cannot reach by sea", () => {
    const landlocked = Square.at(4, 2);

    expect(chart().nextWaypoint({ from: Square.at(9, 9), to: landlocked })).toBe(landlocked);
  });
});

function voyage(plan: { chart: SeaChart; from: Square; to: Square }): Square[] {
  const passage = [plan.from];
  while (passage[passage.length - 1] !== plan.to && passage.length < 50) {
    passage.push(plan.chart.nextWaypoint({ from: passage[passage.length - 1], to: plan.to }));
  }
  return passage;
}

/** The squares a boat would enter only to be nudged back: shore lies next along its course. */
function turnedBackBySandBars(
  passage: readonly Square[],
  view: { isShore(square: Square): boolean },
) {
  return passage.slice(1, -1).filter((square, index) => {
    const before = passage[index];
    const across = square.col - before.col;
    const down = square.row - before.row;
    const aheadAcross = across !== 0 && view.isShore(square.shiftedBy(across));
    const aheadDown = down !== 0 && view.isShore(square.shiftedBy(down * 20));
    return aheadAcross || aheadDown;
  });
}

function cutsCorners(passage: readonly Square[], view: { isNavigable(square: Square): boolean }) {
  return passage.slice(1).filter((square, index) => {
    const before = passage[index];
    const sideways = [Square.at(before.row, square.col), Square.at(square.row, before.col)];
    return !sideways.every((corner) => view.isNavigable(corner));
  });
}
