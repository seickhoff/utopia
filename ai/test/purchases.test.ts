import { DEFAULT_RULES, priceOf } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { PurchasePlanner } from "../src/purchases.js";
import { Valuation } from "../src/valuation.js";
import { aPosition } from "./support/position.js";

const NO_WHIM = 0.99;

function aPlanner(mistakeChance = 0): PurchasePlanner {
  const valuation = new Valuation({ rules: DEFAULT_RULES, horizonRounds: 3 });
  return new PurchasePlanner({ valuation, mistakeChance });
}

const opening = () => aPosition().inRound(1, { rounds: 10 });

describe("planning purchases", () => {
  it("offers the purchases worth making, best first", () => {
    const purchases = aPlanner().purchases({
      view: opening().view("left"),
      whim: NO_WHIM,
      setAside: 0,
    });
    const worths = purchases.map((purchase) => purchase.worth);

    expect(worths).toEqual([...worths].sort((one, other) => other - one));
  });

  it("offers only what is worth more than it costs", () => {
    const purchases = aPlanner().purchases({
      view: opening().view("left"),
      whim: NO_WHIM,
      setAside: 0,
    });

    expect(purchases.every((purchase) => purchase.worth > 0)).toBe(true);
  });

  it("offers only what the treasury can pay for", () => {
    const purchases = aPlanner().purchases({
      view: opening().withGold(30).view("left"),
      whim: NO_WHIM,
      setAside: 0,
    });

    expect(purchases.every((purchase) => priceOf(purchase.item) <= 30)).toBe(true);
  });

  it("spends none of the gold set aside", () => {
    const purchases = aPlanner().purchases({
      view: opening().view("left"),
      whim: NO_WHIM,
      setAside: 90,
    });

    expect(purchases.every((purchase) => priceOf(purchase.item) <= 10)).toBe(true);
  });

  it("offers a site for every building", () => {
    const purchases = aPlanner().purchases({
      view: opening().view("left"),
      whim: NO_WHIM,
      setAside: 0,
    });

    expect(purchases.every((purchase) => purchase.sites.length > 0)).toBe(true);
  });

  it("offers no boat while the harbour holds one", () => {
    const view = opening().withBoat("left", "ptBoat").view("left");

    const items = aPlanner()
      .purchases({ view, whim: NO_WHIM, setAside: 0 })
      .map((purchase) => purchase.item);

    expect(items).not.toContain("fishingBoat");
  });

  it("now and then blunders into a worse purchase", () => {
    const view = opening().view("left");
    const [sound] = aPlanner().purchases({ view, whim: NO_WHIM, setAside: 0 });

    const [blunder] = aPlanner(1).purchases({ view, whim: 0, setAside: 0 });

    expect(blunder.item).not.toBe(sound.item);
  });
});
