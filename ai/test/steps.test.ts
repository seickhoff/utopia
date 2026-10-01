import { DISC_RELEASED, Square, squareUnder } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Errand } from "../src/errand.js";
import { HoldStation, Pause, PressKey, SailTo, SteerCursor, Tidy } from "../src/steps.js";
import { aPosition } from "./support/position.js";
import { Stagehand } from "./support/stagehand.js";

const TARGET = Square.at(3, 2);
const ALLOWED = () => true;
const FORBIDDEN = () => false;
const HOUSE_KEY = 6;
/** Open water on the far side of the left island from its harbour. */
const FAR_WATER = Square.at(5, 6);

function stagehandFor(position = aPosition()): Stagehand {
  return new Stagehand({ game: position.game(), side: "left" });
}

describe("steering the cursor", () => {
  it("brings the cursor onto the square with the disc alone", () => {
    const stagehand = stagehandFor().run(new Errand([new SteerCursor(TARGET)]), { seconds: 10 });

    expect(stagehand.view().pilotSquare()).toBe(TARGET);
  });

  it("lets go of the disc on arrival", () => {
    const stagehand = stagehandFor().run(new Errand([new SteerCursor(TARGET)]), { seconds: 10 });

    expect(stagehand.controls.discReadings().at(-1)).toBe(DISC_RELEASED);
  });

  it("gives up when the governor is out in a boat", () => {
    const errand = new Errand([
      new SteerCursor(TARGET),
      new PressKey({ key: HOUSE_KEY, guard: ALLOWED }),
    ]);

    const stagehand = stagehandFor(aPosition().sailing("left")).run(errand, { seconds: 10 });

    expect(stagehand.controls.commands).toEqual([]);
  });
});

describe("pressing a key", () => {
  it("presses it when the guard allows", () => {
    const stagehand = stagehandFor().actOut(new PressKey({ key: HOUSE_KEY, guard: ALLOWED }));

    expect(stagehand.controls.keys()).toEqual([HOUSE_KEY]);
  });

  it("presses nothing when the guard forbids, and the errand is given up", () => {
    const errand = new Errand([
      new PressKey({ key: HOUSE_KEY, guard: FORBIDDEN }),
      new PressKey({ key: "clear", guard: ALLOWED }),
    ]);

    const stagehand = stagehandFor().run(errand, { seconds: 1 });

    expect([stagehand.controls.keys(), errand.isOver()]).toEqual([[], true]);
  });
});

describe("pausing", () => {
  it("waits out its time before the errand goes on", () => {
    const errand = new Errand([new Pause(0.5), new PressKey({ key: HOUSE_KEY, guard: ALLOWED })]);

    const stagehand = stagehandFor().run(errand, { seconds: 0.25 });

    expect(stagehand.controls.keys()).toEqual([]);
  });

  it("lets the errand go on once its time is up", () => {
    const errand = new Errand([new Pause(0.5), new PressKey({ key: HOUSE_KEY, guard: ALLOWED })]);

    const stagehand = stagehandFor().run(errand, { seconds: 1 });

    expect(stagehand.controls.keys()).toEqual([HOUSE_KEY]);
  });
});

describe("tidying up", () => {
  it("cancels a half-keyed order", () => {
    const stagehand = stagehandFor(aPosition().withSelection("left", "house")).actOut(new Tidy());

    expect(stagehand.view().selection()).toBe("none");
  });

  it("presses nothing when no order is pending", () => {
    expect(stagehandFor().actOut(new Tidy()).controls.keys()).toEqual([]);
  });

  it("lets go of the disc", () => {
    const stagehand = stagehandFor();
    stagehand.run(new Errand([new SteerCursor(Square.at(9, 12)), new Pause(10)]), { seconds: 1 });

    stagehand.actOut(new Tidy());

    expect(stagehand.controls.discReadings().at(-1)).toBe(DISC_RELEASED);
  });
});

describe("sailing", () => {
  it("sails round the island to open water on the far side", () => {
    const stagehand = stagehandFor(aPosition().sailing("left"));

    stagehand.run(new Errand([new SailTo(FAR_WATER)]), { seconds: 45 });

    expect(stagehand.view().pilotSquare()).toBe(FAR_WATER);
  });

  it("keeps to the water all the way", () => {
    const stagehand = stagehandFor(aPosition().sailing("left"));
    const squares = new Set<Square>();

    const errand = new Errand([new SailTo(FAR_WATER)]);
    while (!errand.isOver()) {
      stagehand.run(errand, { seconds: 1 / 60 });
      squares.add(squareUnder(stagehand.view().pilotPoint()));
    }

    expect([...squares].filter((square) => !stagehand.view().isNavigable(square))).toEqual([]);
  });

  it("gives up when the governor is not sailing", () => {
    const errand = new Errand([
      new SailTo(FAR_WATER),
      new PressKey({ key: HOUSE_KEY, guard: ALLOWED }),
    ]);

    const stagehand = stagehandFor().run(errand, { seconds: 1 });

    expect(stagehand.controls.keys()).toEqual([]);
  });

  it("holds station over a square until it is told to leave", () => {
    const hold = new HoldStation({ square: FAR_WATER, seconds: 5, until: FORBIDDEN });
    const stagehand = stagehandFor(aPosition().sailing("left"));

    stagehand.run(new Errand([new SailTo(FAR_WATER), hold]), { seconds: 45 });

    expect(stagehand.view().pilotSquare()).toBe(FAR_WATER);
  });
});

describe("an errand", () => {
  it("takes its steps in order", () => {
    const errand = new Errand([
      new PressKey({ key: HOUSE_KEY, guard: ALLOWED }),
      new PressKey({ key: "clear", guard: ALLOWED }),
    ]);

    expect(stagehandFor().run(errand, { seconds: 1 }).controls.keys()).toEqual([
      HOUSE_KEY,
      "clear",
    ]);
  });

  it("is over once its last step is done", () => {
    const errand = new Errand([new PressKey({ key: HOUSE_KEY, guard: ALLOWED })]);

    stagehandFor().run(errand, { seconds: 1 });

    expect(errand.isOver()).toBe(true);
  });

  it("is over at once when it has nothing to do", () => {
    expect(Errand.none().isOver()).toBe(true);
  });
});
