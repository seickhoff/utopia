import { describe, expect, it } from "vitest";
import { Square } from "../src/geometry/square.js";
import { watersOf } from "../src/game/waters.js";
import { Navigator } from "../src/sea/navigator.js";
import { aGame } from "./support/game-builder.js";

const waters = watersOf(aGame().started().snapshot().board.squares);
/** Open water at the top left, where the chart slants down a square before running east. */
const START = Square.at(0, 0);
const SLANT_TO = Square.at(1, 1);
const FAR_EAST = Square.at(1, 9);

/** A navigator that has set out from the top left for the far east of the sea. */
function aNavigatorUnderWay(): Navigator {
  const navigator = new Navigator();
  navigator.plot({ here: START, goal: FAR_EAST, waters });
  return navigator;
}

describe("the navigator", () => {
  it("sets out on the chart's next leg", () => {
    expect(aNavigatorUnderWay().leg()).toEqual({ from: START, to: SLANT_TO });
  });

  it("keeps to its leg while the boat's middle strays into a square beside it", () => {
    const navigator = aNavigatorUnderWay();

    navigator.plot({ here: Square.at(0, 1), goal: FAR_EAST, waters });

    expect(navigator.leg()).toEqual({ from: START, to: SLANT_TO });
  });

  it("moves on from a leg's last square once the boat is over it", () => {
    const navigator = aNavigatorUnderWay();

    navigator.plot({ here: SLANT_TO, goal: FAR_EAST, waters });

    expect(navigator.leg()).toEqual({ from: SLANT_TO, to: Square.at(1, 2) });
  });

  it("sets out afresh when the goal moves so that the leg no longer leads toward it", () => {
    const navigator = aNavigatorUnderWay();

    navigator.plot({ here: START, goal: Square.at(1, 0), waters });

    expect(navigator.leg()).toEqual({ from: START, to: Square.at(1, 0) });
  });

  it("sets out afresh from wherever the boat is once it has left its leg", () => {
    const navigator = aNavigatorUnderWay();
    const strayed = Square.at(1, 4);

    navigator.plot({ here: strayed, goal: FAR_EAST, waters });

    expect(navigator.leg().from).toBe(strayed);
  });

  it("makes landfall on the open sea nearest a goal on land", () => {
    const landfall = new Navigator().landfall({
      here: Square.at(6, 2),
      goal: Square.at(5, 3),
      waters,
    });

    expect(landfall).toBe(Square.at(6, 2));
  });
});
