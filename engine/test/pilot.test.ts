import { describe, expect, it } from "vitest";
import { DISC_RELEASED } from "../src/geometry/disc.js";
import { PixelPoint } from "../src/geometry/pixel-point.js";
import { Pilot } from "../src/pilots/pilot.js";

const SPEEDS = { cursorSpeed: 15, boatSpeed: 10 };
const START = new PixelPoint(42, 78);
const aPilot = () => new Pilot({ start: START, speeds: SPEEDS });

describe("Pilot", () => {
  it("starts as a cursor at its start", () => {
    const pilot = aPilot();

    expect([pilot.mode().name, pilot.point()]).toEqual(["cursor", START]);
  });

  it("moves a cursor at speed 15", () => {
    const pilot = aPilot();

    pilot.pressDisc(4);

    expect(pilot.velocity()).toEqual({ x: 15, y: 0 });
  });

  it("moves a boat at speed 10", () => {
    const pilot = aPilot();
    pilot.takeBoat("fishingBoat");

    pilot.pressDisc(4);

    expect(pilot.velocity()).toEqual({ x: 10, y: 0 });
  });

  it("stops when the disc is released", () => {
    const pilot = aPilot();
    pilot.pressDisc(2);

    pilot.pressDisc(DISC_RELEASED);

    expect(pilot.velocity()).toEqual({ x: 0, y: 0 });
  });

  it("keeps the cursor's velocity on taking a boat, until the disc changes (as the ROM)", () => {
    const pilot = aPilot();
    pilot.pressDisc(4);

    pilot.takeBoat("ptBoat");

    expect([pilot.mode().aboard, pilot.velocity()]).toEqual(["ptBoat", { x: 15, y: 0 }]);
  });

  it("stays out of the status row", () => {
    const pilot = aPilot();
    pilot.pressDisc(8);

    for (let frame = 0; frame < 1800; frame += 1) pilot.move(16);

    expect(pilot.point().y).toBe(88);
  });

  it("still has its boat aboard while sinking", () => {
    const pilot = aPilot();
    pilot.takeBoat("fishingBoat");

    pilot.sink();

    expect([pilot.mode().name, pilot.mode().aboard]).toEqual(["sinking", "fishingBoat"]);
  });

  it("stands still while sinking, whatever the disc says", () => {
    const pilot = aPilot();
    pilot.takeBoat("fishingBoat");
    pilot.sink();

    pilot.pressDisc(4);
    pilot.move(16);

    expect(pilot.point()).toEqual(START);
  });

  it("comes back as a cursor at its start after sinking", () => {
    const pilot = aPilot();
    pilot.takeBoat("fishingBoat");
    pilot.lay(new PixelPoint(100, 60));
    pilot.sink();

    pilot.respawn();

    expect([pilot.mode().name, pilot.point(), pilot.velocity()]).toEqual([
      "cursor",
      START,
      { x: 0, y: 0 },
    ]);
  });
});
