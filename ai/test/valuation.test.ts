import { DEFAULT_RULES, HARBOURS, Square } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Valuation, type Offer } from "../src/valuation.js";
import { aPosition } from "./support/position.js";
import type { IslandView } from "../src/island-view.js";

const ANY_SITE = Square.at(8, 11);
const HEART = Square.at(4, 2);
const RING = [Square.at(3, 1), Square.at(3, 2), Square.at(3, 3), Square.at(4, 1)];
const OUTSKIRTS = [Square.at(8, 8), Square.at(8, 9), Square.at(8, 10), Square.at(7, 8)];
const TEN_ROUNDS = { rounds: 10 };

function worth(offer: Offer, look: { view: IslandView; horizonRounds: number }): number {
  return new Valuation({ rules: DEFAULT_RULES, horizonRounds: look.horizonRounds }).worthOf(
    offer,
    look.view,
  );
}

describe("valuing a purchase", () => {
  it("values the first crop well above a third", () => {
    const bare = aPosition().view("left");
    const planted = aPosition()
      .withBuilding("left", "crop", Square.at(8, 10))
      .withBuilding("left", "crop", Square.at(8, 9))
      .view("left");
    const offer: Offer = { item: "crop", site: ANY_SITE };

    expect(worth(offer, { view: bare, horizonRounds: 3 })).toBeGreaterThan(
      worth(offer, { view: planted, horizonRounds: 3 }),
    );
  });

  it("values a factory more the further ahead it looks", () => {
    const view = aPosition().inRound(1, TEN_ROUNDS).view("left");
    const offer: Offer = { item: "factory", site: ANY_SITE };

    expect(worth(offer, { view, horizonRounds: 6 })).toBeGreaterThan(
      worth(offer, { view, horizonRounds: 1 }),
    );
  });

  it("values a house nothing once the island is housed", () => {
    const view = aPosition()
      .withGold(300)
      .withBuilding("left", "house", Square.at(3, 1))
      .withBuilding("left", "house", Square.at(3, 2))
      .withBuilding("left", "house", Square.at(3, 3))
      .inRound(1, TEN_ROUNDS)
      .view("left");

    expect(worth({ item: "house", site: ANY_SITE }, { view, horizonRounds: 3 })).toBeLessThan(0);
  });

  it("values a hospital more in the last round than in the first, before its people crowd in", () => {
    const offer: Offer = { item: "hospital", site: ANY_SITE };
    const first = aPosition().inRound(1, TEN_ROUNDS).view("left");
    const last = aPosition().inRound(10, TEN_ROUNDS).view("left");

    expect(worth(offer, { view: last, horizonRounds: 6 })).toBeGreaterThan(
      worth(offer, { view: first, horizonRounds: 6 }),
    );
  });

  it("spends the last round's gold on anything that scores, since gold is then worth nothing", () => {
    const view = aPosition().inRound(3, { rounds: 3 }).view("left");

    expect(worth({ item: "school", site: ANY_SITE }, { view, horizonRounds: 6 })).toBeGreaterThan(
      0,
    );
  });

  it("values a fishing boat for the food and gold it brings", () => {
    const view = aPosition().inRound(1, TEN_ROUNDS).view("left");

    expect(
      worth({ item: "fishingBoat", site: HARBOURS.left }, { view, horizonRounds: 3 }),
    ).toBeGreaterThan(0);
  });

  it("values a fort by the buildings it would guard from rebels", () => {
    const town = RING.reduce(
      (position, square) => position.withBuilding("left", "house", square),
      aPosition().withGold(500).inRound(1, TEN_ROUNDS),
    );
    const outskirts = OUTSKIRTS.reduce(
      (position, square) => position.withBuilding("left", "house", square),
      aPosition().withGold(500).inRound(1, TEN_ROUNDS),
    );
    const offer: Offer = { item: "fort", site: HEART };

    expect(worth(offer, { view: town.view("left"), horizonRounds: 3 })).toBeGreaterThan(
      worth(offer, { view: outskirts.view("left"), horizonRounds: 3 }),
    );
  });
});
