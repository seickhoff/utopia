import { DISC_RELEASED, Navigator, PixelPoint, Square, squareAnchor } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Hand } from "../src/hand.js";
import { sailToward } from "../src/helm.js";
import { aPosition } from "./support/position.js";
import { RecordingControls } from "./support/recording-controls.js";

const EAST = 4;

function aHelmAt(pilot: { x: number; y: number }) {
  const controls = new RecordingControls();
  const hand = new Hand();
  hand.grasp(controls);
  hand.steer(EAST);
  const view = aPosition()
    .withPilot("left", { mode: "sailing", aboard: "fishingBoat", ...pilot })
    .view("left");
  return { helm: { view, hand, navigator: new Navigator() }, controls };
}

describe("the helm", () => {
  it("holds the boat still rather than drive it at a point over land", () => {
    const { helm, controls } = aHelmAt(squareAnchor(Square.at(6, 2)));

    sailToward(helm, squareAnchor(Square.at(5, 3)));

    expect(controls.discReadings().at(-1)).toBe(DISC_RELEASED);
  });

  it("sails for a point out on open water", () => {
    const { helm, controls } = aHelmAt(squareAnchor(Square.at(9, 2)));

    sailToward(
      helm,
      new PixelPoint(squareAnchor(Square.at(9, 5)).x, squareAnchor(Square.at(9, 5)).y),
    );

    expect(controls.discReadings().at(-1)).toBe(EAST);
  });

  it("holds its heading a pixel or two off its line, rather than swing at each square", () => {
    const anchor = squareAnchor(Square.at(9, 2));
    const { helm } = aHelmAt({ x: anchor.x + 2, y: anchor.y - 2 });

    sailToward(helm, squareAnchor(Square.at(9, 8)));

    expect(helm.hand.heading()).toBe(EAST);
  });
});
