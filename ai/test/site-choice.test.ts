import { Square } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { sitesFor } from "../src/site-choice.js";
import { aPosition } from "./support/position.js";

/** The one square of each island with land all round it. */
const LEFT_HEART = Square.at(4, 2);
const RIGHT_HEART = Square.at(6, 17);

function isBeside(square: Square, centre: Square): boolean {
  const apart = Math.max(Math.abs(square.row - centre.row), Math.abs(square.col - centre.col));
  return apart === 1;
}

describe("choosing where to build", () => {
  it("puts the fort where it guards the most land: the heart of the left island", () => {
    expect(sitesFor({ item: "fort", view: aPosition().view("left") })[0]).toBe(LEFT_HEART);
  });

  it("puts the fort at the heart of the right island", () => {
    expect(sitesFor({ item: "fort", view: aPosition().view("right") })[0]).toBe(RIGHT_HEART);
  });

  it("builds the town in a ring round the fort's site", () => {
    const [site] = sitesFor({ item: "house", view: aPosition().view("left") });

    expect(isBeside(site, LEFT_HEART)).toBe(true);
  });

  it("keeps the fort's site free until nowhere else is left", () => {
    const sites = sitesFor({ item: "school", view: aPosition().view("left") });

    expect(sites[sites.length - 1]).toBe(LEFT_HEART);
  });

  it("rings the town round a fort already built", () => {
    const fort = Square.at(7, 6);
    const view = aPosition().withBuilding("left", "fort", fort).view("left");

    expect(isBeside(sitesFor({ item: "factory", view })[0], fort)).toBe(true);
  });

  it("plants crops out on the edge of the island, away from the town", () => {
    const [site] = sitesFor({ item: "crop", view: aPosition().view("left") });

    expect(site).toBe(Square.at(8, 11));
  });

  it("offers only land that is free", () => {
    const [ringSquare] = sitesFor({ item: "house", view: aPosition().view("left") });
    const view = aPosition().withBuilding("left", "crop", ringSquare).view("left");

    expect(sitesFor({ item: "house", view })).not.toContain(ringSquare);
  });

  it("offers no site for rebels, which land on the other island", () => {
    expect(sitesFor({ item: "rebel", view: aPosition().view("left") })).toEqual([]);
  });

  it("moves the fort's site on when the heart of the island is taken", () => {
    const view = aPosition().withBuilding("left", "house", LEFT_HEART).view("left");

    expect(sitesFor({ item: "fort", view })[0]).not.toBe(LEFT_HEART);
  });
});
