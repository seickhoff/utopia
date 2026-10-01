import { HARBOURS, SeededRandom, Square, keyOf } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Errand } from "../src/errand.js";
import type { Intent } from "../src/intent.js";
import { Build, BuyBoat, PlantRebel } from "../src/orders.js";
import { Pace } from "../src/pace.js";
import { aPosition } from "./support/position.js";
import { Stagehand } from "./support/stagehand.js";

const SITE = Square.at(3, 2);
const BRISK = new Pace({ reactionSeconds: 0, keyGapSeconds: 0, random: new SeededRandom(1) });

function carryOut(intent: Intent, position = aPosition()): Stagehand {
  const stagehand = new Stagehand({ game: position.game(), side: "left" });
  return stagehand.run(new Errand(intent.stepsAt(BRISK)), { seconds: 30 });
}

describe("building", () => {
  it("builds the item on its site", () => {
    const stagehand = carryOut(new Build({ item: "house", site: SITE }));

    expect(stagehand.view().holds({ square: SITE, item: "house" })).toBe(true);
  });

  it("keys in the item and Enter once the cursor is over the site", () => {
    const stagehand = carryOut(new Build({ item: "house", site: SITE }));

    expect(stagehand.controls.keys()).toEqual([keyOf("house"), "enter"]);
  });

  it("cancels a half-keyed order before it starts", () => {
    const stagehand = carryOut(
      new Build({ item: "house", site: SITE }),
      aPosition().withSelection("left", "crop"),
    );

    expect(stagehand.controls.keys()[0]).toBe("clear");
  });

  it("keys nothing in when the site has been taken", () => {
    const stagehand = carryOut(
      new Build({ item: "house", site: SITE }),
      aPosition().withBuilding("left", "crop", SITE),
    );

    expect(stagehand.controls.keys()).toEqual([]);
  });

  it("keys nothing in that the treasury cannot pay for", () => {
    const stagehand = carryOut(
      new Build({ item: "hospital", site: SITE }),
      aPosition().withGold(10),
    );

    expect(stagehand.controls.keys()).toEqual([]);
  });

  it("sees it came about once the item stands on its site", () => {
    const build = new Build({ item: "house", site: SITE });

    expect(build.cameAbout(carryOut(build).view())).toBe(true);
  });

  it("sees it did not come about while the site stands empty", () => {
    expect(new Build({ item: "house", site: SITE }).cameAbout(aPosition().view("left"))).toBe(
      false,
    );
  });
});

describe("buying a boat", () => {
  it("launches it in the harbour", () => {
    const stagehand = carryOut(new BuyBoat("fishingBoat"));

    expect(stagehand.view().holds({ square: HARBOURS.left, item: "fishingBoat" })).toBe(true);
  });

  it("leaves the cursor where it is", () => {
    expect(carryOut(new BuyBoat("fishingBoat")).controls.discReadings()).toEqual([]);
  });

  it("keys nothing in while the harbour holds a boat", () => {
    const stagehand = carryOut(new BuyBoat("fishingBoat"), aPosition().withBoat("left", "ptBoat"));

    expect(stagehand.controls.keys()).toEqual([]);
  });
});

describe("planting rebels", () => {
  it("lands a rebel band on the other island", () => {
    const stagehand = carryOut(new PlantRebel({ rebelsThere: 0 }));

    expect(stagehand.view().opponent().count("rebel")).toBe(1);
  });

  it("sees it came about once there are more rebels over there than before", () => {
    const planting = new PlantRebel({ rebelsThere: 0 });

    expect(planting.cameAbout(carryOut(planting).view())).toBe(true);
  });
});
