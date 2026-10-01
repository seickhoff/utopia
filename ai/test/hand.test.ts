import { DISC_RELEASED } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Hand } from "../src/hand.js";
import { RecordingControls } from "./support/recording-controls.js";

const EAST = 4;
const SOUTH = 8;

function aHandOn(controls: RecordingControls): Hand {
  const hand = new Hand();
  hand.grasp(controls);
  return hand;
}

describe("the governor's hand", () => {
  it("presses the disc toward a heading", () => {
    const controls = new RecordingControls();

    aHandOn(controls).steer(EAST);

    expect(controls.discReadings()).toEqual([EAST]);
  });

  it("holds a heading without pressing it again", () => {
    const controls = new RecordingControls();
    const hand = aHandOn(controls);

    hand.steer(EAST);
    hand.steer(EAST);

    expect(controls.discReadings()).toEqual([EAST]);
  });

  it("moves the disc when the heading changes", () => {
    const controls = new RecordingControls();
    const hand = aHandOn(controls);

    hand.steer(EAST);
    hand.steer(SOUTH);

    expect(controls.discReadings()).toEqual([EAST, SOUTH]);
  });

  it("presses the held heading again on request, as a person does when their boat has stopped", () => {
    const controls = new RecordingControls();
    const hand = aHandOn(controls);

    hand.steer(EAST);
    hand.pressAgain();

    expect(controls.discReadings()).toEqual([EAST, EAST]);
  });

  it("lets go of the disc", () => {
    const controls = new RecordingControls();
    const hand = aHandOn(controls);

    hand.steer(EAST);
    hand.letGo();

    expect(controls.discReadings()).toEqual([EAST, DISC_RELEASED]);
  });

  it("starts with the disc released, so letting go at once sends nothing", () => {
    const controls = new RecordingControls();

    aHandOn(controls).letGo();

    expect(controls.discReadings()).toEqual([]);
  });

  it("presses keypad keys", () => {
    const controls = new RecordingControls();

    aHandOn(controls).press("enter");

    expect(controls.keys()).toEqual(["enter"]);
  });

  it("remembers the heading it holds", () => {
    const hand = aHandOn(new RecordingControls());

    hand.steer(SOUTH);

    expect(hand.heading()).toBe(SOUTH);
  });
});
