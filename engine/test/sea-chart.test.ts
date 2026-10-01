import { describe, expect, it } from "vitest";
import { Square } from "../src/geometry/square.js";
import { watersOf } from "../src/game/waters.js";
import { SeaChart } from "../src/sea/sea-chart.js";
import { aGame } from "./support/game-builder.js";

/** The sea at the start of a game: the two islands, and open water all round them. */
const theSea = () => watersOf(aGame().started().snapshot().board.squares);

function chart(): SeaChart {
  return SeaChart.of(theSea());
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

  it("sails straight down a clear run of water, rather than weaving along it", () => {
    const passage = voyage({ chart: chart(), from: Square.at(1, 0), to: Square.at(1, 12) });

    expect(passage.every((square) => square.row === 1)).toBe(true);
  });

  it("slants first and then runs straight across open water, turning only once", () => {
    const passage = voyage({ chart: chart(), from: Square.at(1, 0), to: Square.at(0, 9) });

    expect(turnsIn(passage)).toBe(1);
  });

  it("takes the straightest of the shortest ways, not dipping south and back past an island", () => {
    const passage = voyage({ chart: chart(), from: Square.at(1, 1), to: Square.at(3, 18) });

    expect(passage.filter((square) => square.col <= 16).every((square) => square.row === 1)).toBe(
      true,
    );
  });

  it("sails round an island rather than over it", () => {
    const from = Square.at(4, 0);
    const to = Square.at(4, 5);
    const sea = theSea();
    const passage = voyage({ chart: SeaChart.of(sea), from, to });

    expect(passage.every((square) => sea.isNavigable(square))).toBe(true);
  });

  it("never cuts the corner of an island", () => {
    const sea = theSea();
    const passage = voyage({
      chart: SeaChart.of(sea),
      from: Square.at(1, 1),
      to: Square.at(6, 7),
    });

    expect(cutsCorners(passage, sea)).toEqual([]);
  });

  it("never sails on through a square whose next square along its course is shore", () => {
    const sea = theSea();
    const passage = voyage({
      chart: SeaChart.of(sea),
      from: Square.at(6, 2),
      to: Square.at(4, 6),
    });

    expect(turnedBackBySandBars(passage, sea)).toEqual([]);
  });

  it("never slants past a square the sand bars would turn it back from, grazing it", () => {
    const sea = theSea();
    const passage = voyage({ chart: SeaChart.of(sea), from: Square.at(7, 1), to: Square.at(2, 0) });

    expect(grazedBySandBars(passage, sea)).toEqual([]);
  });

  it("may end a passage on a square with shore beyond, letting go of the disc there", () => {
    const sea = theSea();
    const landlockedBay = Square.at(5, 6);

    const passage = voyage({ chart: SeaChart.of(sea), from: Square.at(9, 12), to: landlockedBay });

    expect(passage[passage.length - 1]).toBe(landlockedBay);
  });

  it("makes landfall at a destination a boat can sail to", () => {
    const destination = Square.at(9, 9);

    expect(chart().landfall({ from: Square.at(0, 0), to: destination })).toBe(destination);
  });

  it("makes landfall on the open sea nearest a point on land, the boat's side of it", () => {
    const land = Square.at(5, 3);
    const landfallFrom = (from: Square) => chart().landfall({ from, to: land });

    expect([landfallFrom(Square.at(6, 2)), landfallFrom(Square.at(0, 4))]).toEqual([
      Square.at(6, 2),
      Square.at(4, 4),
    ]);
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

/** How many times a passage changes heading from one square to the next. */
function turnsIn(passage: readonly Square[]): number {
  const steps = passage.slice(1).map((square, index) => {
    const before = passage[index];
    return `${square.row - before.row},${square.col - before.col}`;
  });
  return steps.slice(1).filter((step, index) => step !== steps[index]).length;
}

/** The squares a boat would enter only to be nudged back: shore lies next along its course. */
function turnedBackBySandBars(
  passage: readonly Square[],
  sea: { isShore(square: Square): boolean },
) {
  return passage.slice(1, -1).filter((square, index) => {
    const before = passage[index];
    const across = square.col - before.col;
    const down = square.row - before.row;
    const aheadAcross = across !== 0 && sea.isShore(square.shiftedBy(across));
    const aheadDown = down !== 0 && sea.isShore(square.shiftedBy(down * 20));
    return aheadAcross || aheadDown;
  });
}

/**
 * The slanting steps whose middle passes through a square beside the step with shore beyond it
 * along the course, where the sand bars would turn the boat back.
 */
function grazedBySandBars(passage: readonly Square[], sea: { isShore(square: Square): boolean }) {
  return passage.slice(1).filter((square, index) => {
    const before = passage[index];
    const down = square.row - before.row;
    const across = square.col - before.col;
    if (down === 0 || across === 0) return false;
    const beyondAbove = before.shiftedBy(2 * down * 20);
    const beyondBeside = before.shiftedBy(2 * across);
    return sea.isShore(beyondAbove) || sea.isShore(beyondBeside);
  });
}

function cutsCorners(passage: readonly Square[], sea: { isNavigable(square: Square): boolean }) {
  return passage.slice(1).filter((square, index) => {
    const before = passage[index];
    const sideways = [Square.at(before.row, square.col), Square.at(square.row, before.col)];
    return !sideways.every((corner) => sea.isNavigable(corner));
  });
}
