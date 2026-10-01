import { DISC_RELEASED, HARBOURS, ISLANDS, Square, squareAnchor } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { aPosition, aSprite } from "./support/position.js";

const LEFT_LAND = Square.at(3, 2);
const RIGHT_LAND = Square.at(3, 11);
const OPEN_WATER = Square.at(9, 9);
const EAST = 4;

describe("a governor's view of their island", () => {
  it("counts every empty square of their own island as buildable at the start", () => {
    expect(aPosition().view("left").buildableSquares()).toHaveLength(ISLANDS.left.length);
  });

  it("does not count a square already built on as buildable", () => {
    const view = aPosition().withBuilding("left", "crop", LEFT_LAND).view("left");

    expect(view.isBuildable(LEFT_LAND)).toBe(false);
  });

  it("does not count the other island's land as buildable", () => {
    expect(aPosition().view("left").isBuildable(RIGHT_LAND)).toBe(false);
  });

  it("sees open water where nothing floats", () => {
    expect(aPosition().view("left").isOpenWater(OPEN_WATER)).toBe(true);
  });

  it("does not see open water where a boat is anchored", () => {
    const view = aPosition().withBoat("left", "fishingBoat").view("left");

    expect(view.isOpenWater(HARBOURS.left)).toBe(false);
  });

  it("sees land as shore a boat cannot sail onto", () => {
    expect(aPosition().view("left").isShore(LEFT_LAND)).toBe(true);
  });

  it("sees an anchored boat as no shore, since boats sail past anchored boats", () => {
    const view = aPosition().withBoat("left", "fishingBoat").view("left");

    expect(view.isShore(HARBOURS.left)).toBe(false);
  });

  it("finds its own anchored boats", () => {
    const view = aPosition().withBoat("right", "fishingBoat").view("right");

    expect(view.anchoredBoats("fishingBoat")).toEqual([HARBOURS.right]);
  });

  it("knows a square its own fort guards", () => {
    const view = aPosition().withBuilding("left", "fort", LEFT_LAND).view("left");

    expect(view.isGuarded(Square.at(4, 2))).toBe(true);
  });

  it("does not count the other side's fort as a guard", () => {
    const view = aPosition().withBuilding("left", "fort", LEFT_LAND).view("right");

    expect(view.isGuarded(Square.at(4, 2))).toBe(false);
  });

  it("sees the pilot's square from its sprite point", () => {
    const view = aPosition().withCursorAt("left", LEFT_LAND).view("left");

    expect(view.pilotSquare()).toBe(LEFT_LAND);
  });

  it("knows the pilot has arrived when it sits on the point", () => {
    const view = aPosition().withCursorAt("left", LEFT_LAND).view("left");

    expect(view.hasArrivedAt(squareAnchor(LEFT_LAND))).toBe(true);
  });

  it("sees a pilot at rest heeding a released disc", () => {
    expect(aPosition().view("left").heeds(DISC_RELEASED)).toBe(true);
  });

  it("sees a pilot at rest ignoring a pressed disc", () => {
    expect(aPosition().view("left").heeds(EAST)).toBe(false);
  });

  it("sees a sailing pilot's boat", () => {
    expect(aPosition().sailing("left").view("left").isSailing("fishingBoat")).toBe(true);
  });

  it("finds the sprites of one kind", () => {
    const fish = aSprite("fish", { x: 40, y: 88 });
    const view = aPosition()
      .withSprites(fish, aSprite("pirate", { x: 90, y: 8 }))
      .view("left");

    expect(view.sprites("fish")).toEqual([fish]);
  });

  it("knows what it can afford", () => {
    const view = aPosition().withGold(40).view("left");

    expect([view.canAfford("factory"), view.canAfford("fort")]).toEqual([true, false]);
  });

  it("sees the opponent's island through their eyes", () => {
    const view = aPosition().withBuilding("right", "crop", RIGHT_LAND).view("left");

    expect(view.opponent().count("crop")).toBe(1);
  });

  it("sees no rebel landing site on an island whose every square a fort guards", () => {
    const forts = [
      Square.at(3, 2),
      Square.at(5, 2),
      Square.at(6, 4),
      Square.at(8, 4),
      Square.at(7, 7),
      Square.at(8, 10),
    ];
    const position = aPosition().withGold(500);
    forts.forEach((fort) => position.withBuilding("left", "fort", fort));

    expect(position.view("right").opponent().hasRebelLandingSite()).toBe(false);
  });
});
