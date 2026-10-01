import { HARBOURS, Square, priceOf } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Peaceful, Retaliatory, Scheming, type Aggression } from "../src/aggression.js";
import type { IslandView } from "../src/island-view.js";
import { aPosition } from "./support/position.js";

const RICH = 500;

function keysOf(aggression: Aggression, view: IslandView): string[] {
  return aggression.proposals(view).map((intent) => intent.key);
}

function watching<T extends Aggression>(aggression: T, ...views: IslandView[]): T {
  views.forEach((view) => aggression.watch(view));
  return aggression;
}

const calm = () => aPosition().withGold(RICH);
const provoked = () => aPosition().withGold(RICH).withRebelsLandedBy("right");
const trailing = () => aPosition().withGold(RICH).withIsland("right", { totalScore: 40 });

describe("keeping the peace", () => {
  it("never plants rebels, whatever the other side does", () => {
    const peaceful = watching(new Peaceful(), calm().view("left"), provoked().view("left"));

    expect(keysOf(peaceful, provoked().view("left"))).toEqual([]);
  });

  it("sets no gold aside", () => {
    expect(new Peaceful().goldSetAside()).toBe(0);
  });
});

describe("retaliating", () => {
  it("plants nothing unprovoked", () => {
    const retaliatory = watching(new Retaliatory(), calm().view("left"));

    expect(keysOf(retaliatory, calm().view("left"))).toEqual([]);
  });

  it("answers a rebel band landed on its island with one of its own", () => {
    const retaliatory = watching(new Retaliatory(), calm().view("left"), provoked().view("left"));

    expect(keysOf(retaliatory, provoked().view("left"))).toEqual(["plant rebel"]);
  });

  it("takes no offence at rebels rising in unrest at the end of a round", () => {
    const unrest = provoked().inPhase("scores").view("left");
    const retaliatory = watching(new Retaliatory(), calm().view("left"), unrest);

    expect(keysOf(retaliatory, unrest)).toEqual([]);
  });

  it("sets aside the price of a rebel band while one is owed", () => {
    const retaliatory = watching(new Retaliatory(), calm().view("left"), provoked().view("left"));

    expect(retaliatory.goldSetAside()).toBe(priceOf("rebel"));
  });

  it("is satisfied once its own band has landed", () => {
    const answered = provoked().withRebelsLandedBy("left").view("left");
    const retaliatory = watching(
      new Retaliatory(),
      calm().view("left"),
      provoked().view("left"),
      answered,
    );

    expect(keysOf(retaliatory, answered)).toEqual([]);
  });
});

describe("scheming", () => {
  it("keeps the peace while it is not behind", () => {
    expect(keysOf(watching(new Scheming(), calm().view("left")), calm().view("left"))).toEqual([]);
  });

  it("sets nothing aside while it is not far behind", () => {
    const view = aPosition().withIsland("right", { totalScore: 5 }).view("left");

    expect(watching(new Scheming(), view).goldSetAside(view)).toBe(0);
  });

  it("saves for a fort when it falls behind without one", () => {
    const view = trailing().view("left");

    expect(watching(new Scheming(), view).goldSetAside(view)).toBe(priceOf("fort"));
  });

  it("saves for a rebel band when behind, with its fort built", () => {
    const view = trailing().withBuilding("left", "fort", Square.at(4, 2)).view("left");

    expect(watching(new Scheming(), view).goldSetAside(view)).toBe(priceOf("rebel"));
  });

  it("builds a fort first when it falls behind", () => {
    const view = trailing().view("left");

    expect(keysOf(watching(new Scheming(), view), view)[0]).toMatch(/^build fort/);
  });

  it("comes ashore to build that fort when out fishing", () => {
    const view = trailing().sailing("left").view("left");

    expect(keysOf(watching(new Scheming(), view), view)[0]).toMatch(/^anchor at/);
  });

  it("plants rebels when behind, with a fort built", () => {
    const view = trailing().withBuilding("left", "fort", Square.at(4, 2)).view("left");

    expect(keysOf(watching(new Scheming(), view), view)).toContain("plant rebel");
  });

  it("plants no more than one band a round", () => {
    const before = trailing().withBuilding("left", "fort", Square.at(4, 2));
    const after = trailing()
      .withBuilding("left", "fort", Square.at(4, 2))
      .withRebelsLandedBy("left");
    const scheming = watching(new Scheming(), before.view("left"), after.view("left"));

    expect(keysOf(scheming, after.view("left"))).not.toContain("plant rebel");
  });

  it("buys a PT boat to raid an anchored fishing boat no fort guards", () => {
    const view = trailing()
      .withBuilding("left", "fort", Square.at(4, 2))
      .withBoat("right", "fishingBoat")
      .view("left");

    expect(keysOf(watching(new Scheming(), view), view)).toContain("buy ptBoat");
  });

  it("raids that fishing boat once out in its PT boat", () => {
    const view = trailing()
      .withBuilding("left", "fort", Square.at(4, 2))
      .withBoat("right", "fishingBoat")
      .sailing("left", "ptBoat")
      .view("left");

    expect(keysOf(watching(new Scheming(), view), view)).toContain(`raid ${HARBOURS.right.offset}`);
  });

  it("answers rebels landed on it, even while ahead", () => {
    const scheming = watching(new Scheming(), calm().view("left"), provoked().view("left"));

    expect(keysOf(scheming, provoked().view("left"))).toEqual(["plant rebel"]);
  });
});
