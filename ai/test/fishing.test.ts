import { HARBOURS, PixelPoint, Square, squareUnder, type DrifterKind } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { anchoragesFor, fishingTarget } from "../src/fishing.js";
import { aPosition, aSprite } from "./support/position.js";

const MINDS_WEATHER: readonly DrifterKind[] = ["hurricane", "pirate"];
const CAREFREE: readonly DrifterKind[] = [];
/** A boat out in the open water south of the left island. */
const BOAT = { mode: "sailing", aboard: "fishingBoat", x: 72, y: 80 } as const;

function distance(one: PixelPoint, other: { x: number; y: number }): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

describe("chasing fish", () => {
  it("heads for the nearest school", () => {
    const near = aSprite("fish", { x: 100, y: 84 });
    const far = aSprite("fish", { x: 150, y: 10 });
    const view = aPosition().withPilot("left", BOAT).withSprites(far, near).view("left");

    expect(fishingTarget({ view, hazards: CAREFREE })).toEqual(new PixelPoint(near.x, near.y));
  });

  it("runs from a hurricane close by when it minds the weather", () => {
    const hurricane = aSprite("hurricane", { x: 60, y: 56 });
    const fish = aSprite("fish", { x: 64, y: 80 });
    const view = aPosition().withPilot("left", BOAT).withSprites(hurricane, fish).view("left");

    const target = fishingTarget({ view, hazards: MINDS_WEATHER });

    expect(distance(target, hurricane)).toBeGreaterThan(distance(view.pilotPoint(), hurricane));
  });

  it("runs to open water next to the boat, never onto the shore", () => {
    const hurricane = aSprite("hurricane", { x: 72, y: 36 });
    const inTheBay = { x: 56, y: 48 };
    const view = aPosition()
      .withPilot("left", { ...BOAT, ...inTheBay })
      .withSprites(hurricane)
      .view("left");

    expect(view.isNavigable(squareUnder(fishingTarget({ view, hazards: MINDS_WEATHER })))).toBe(
      true,
    );
  });

  it("sails on after fish whatever the weather when it does not mind it", () => {
    const hurricane = aSprite("hurricane", { x: 60, y: 56 });
    const fish = aSprite("fish", { x: 64, y: 80 });
    const view = aPosition().withPilot("left", BOAT).withSprites(hurricane, fish).view("left");

    expect(fishingTarget({ view, hazards: CAREFREE })).toEqual(new PixelPoint(fish.x, fish.y));
  });

  it("passes over a school swimming beside a pirate", () => {
    const pirate = aSprite("pirate", { x: 124, y: 84 });
    const guarded = aSprite("fish", { x: 120, y: 84 });
    const free = aSprite("fish", { x: 20, y: 10 });
    const view = aPosition()
      .withPilot("left", BOAT)
      .withSprites(pirate, guarded, free)
      .view("left");

    expect(fishingTarget({ view, hazards: MINDS_WEATHER })).toEqual(new PixelPoint(free.x, free.y));
  });

  it("fishes a school a pirate is merely heading toward, since pirates must touch a boat to take it", () => {
    const pirate = aSprite("pirate", { x: 144, y: 84 });
    const school = aSprite("fish", { x: 120, y: 84 });
    const view = aPosition().withPilot("left", BOAT).withSprites(pirate, school).view("left");

    expect(fishingTarget({ view, hazards: MINDS_WEATHER })).toEqual(
      new PixelPoint(school.x, school.y),
    );
  });

  it("gives a hurricane a wider berth than a pirate", () => {
    const hurricane = aSprite("hurricane", { x: 136, y: 70 });
    const school = aSprite("fish", { x: 120, y: 84 });
    const view = aPosition().withPilot("left", BOAT).withSprites(hurricane, school).view("left");

    expect(fishingTarget({ view, hazards: MINDS_WEATHER })).toEqual(view.pilotPoint());
  });

  it("waits where it is while no fish are about", () => {
    const view = aPosition().withPilot("left", BOAT).view("left");

    expect(fishingTarget({ view, hazards: CAREFREE })).toEqual(view.pilotPoint());
  });
});

describe("choosing an anchorage", () => {
  it("never blocks a harbour", () => {
    const anchorages = anchoragesFor(aPosition().view("left"));

    expect([anchorages.includes(HARBOURS.left), anchorages.includes(HARBOURS.right)]).toEqual([
      false,
      false,
    ]);
  });

  it("offers only open water", () => {
    const view = aPosition().view("right");

    expect(anchoragesFor(view).every((square) => view.isOpenWater(square))).toBe(true);
  });

  it("offers only water with no shore beside it, where a boat comes to rest however it sails in", () => {
    const view = aPosition().view("left");
    const besideShore = (square: Square) =>
      [square.shiftedBy(1), square.shiftedBy(-1), square.shiftedBy(20), square.shiftedBy(-20)].some(
        (next) => view.isShore(next),
      );

    expect(anchoragesFor(view).filter(besideShore)).toEqual([]);
  });

  it("keeps out of the upper left, where hurricanes form", () => {
    const view = aPosition().withCursorAt("left", Square.at(1, 1)).view("left");
    const [best] = anchoragesFor(view);

    expect(best.row > 4 || best.col > 7).toBe(true);
  });

  it("keeps out of the lanes the pirates sail", () => {
    const [best] = anchoragesFor(aPosition().withCursorAt("left", Square.at(10, 12)).view("left"));

    expect([0, 1, 9, 10]).not.toContain(best.row);
  });

  it("prefers water its own fort guards from ramming", () => {
    const eastTip = Square.at(8, 11);
    const view = aPosition().withBuilding("left", "fort", eastTip).view("left");

    expect(view.isGuarded(anchoragesFor(view)[0])).toBe(true);
  });
});
