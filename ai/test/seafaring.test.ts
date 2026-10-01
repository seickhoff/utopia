import { HARBOURS, SeededRandom, Square } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Errand } from "../src/errand.js";
import type { Intent } from "../src/intent.js";
import { Pace } from "../src/pace.js";
import { Anchor, Fish, Raid, TakeOut } from "../src/seafaring.js";
import { aPosition } from "./support/position.js";
import { Stagehand } from "./support/stagehand.js";

const BRISK = new Pace({ reactionSeconds: 0, keyGapSeconds: 0, random: new SeededRandom(1) });
const OPEN_WATER = Square.at(8, 2);

function carryOut(intent: Intent, position: ReturnType<typeof aPosition>): Stagehand {
  const stagehand = new Stagehand({ game: position.game(), side: "left" });
  return stagehand.run(new Errand(intent.stepsAt(BRISK)), { seconds: 60 });
}

describe("taking a boat out", () => {
  it("flies the cursor onto the anchored boat and takes it out", () => {
    const stagehand = carryOut(
      new TakeOut(HARBOURS.left),
      aPosition().withBoat("left", "fishingBoat"),
    );

    expect(stagehand.view().isSailing("fishingBoat")).toBe(true);
  });

  it("sees it came about once the governor is out in the boat", () => {
    const takeOut = new TakeOut(HARBOURS.left);
    const stagehand = carryOut(takeOut, aPosition().withBoat("left", "fishingBoat"));

    expect(takeOut.cameAbout(stagehand.view())).toBe(true);
  });
});

describe("anchoring", () => {
  it("sails to the anchorage and drops anchor there", () => {
    const stagehand = carryOut(new Anchor(OPEN_WATER), aPosition().sailing("left"));

    expect(stagehand.view().holds({ square: OPEN_WATER, item: "fishingBoat" })).toBe(true);
  });

  it("hands the governor back the cursor", () => {
    const stagehand = carryOut(new Anchor(OPEN_WATER), aPosition().sailing("left"));

    expect(stagehand.view().pilotMode()).toBe("cursor");
  });
});

describe("fishing", () => {
  it("stays out in the boat for its stint", () => {
    const stagehand = carryOut(new Fish({ hazards: [] }), aPosition().sailing("left"));

    expect(stagehand.view().isSailing("fishingBoat")).toBe(true);
  });
});

describe("raiding", () => {
  it("rams the other side's anchored fishing boat until it sinks", () => {
    const position = aPosition().withBoat("right", "fishingBoat").sailing("left", "ptBoat");

    const stagehand = carryOut(new Raid(HARBOURS.right), position);

    expect(stagehand.view().opponent().holds({ square: HARBOURS.right, item: "fishingBoat" })).toBe(
      false,
    );
  });
});
