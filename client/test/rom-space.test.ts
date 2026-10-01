import { Square, squareAnchor, squareUnder } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import {
  CARD_SIZE,
  isOnBoard,
  nearestOnBoard,
  spriteOverWorld,
  worldOfScreenPixel,
  worldOfSprite,
} from "../src/board/rom-space.js";

describe("rom space", () => {
  it("puts the first card's centre half a unit in from the board's north-west corner", () => {
    expect(worldOfSprite(squareAnchor(Square.at(0, 0)), CARD_SIZE)).toEqual({ x: -9.5, z: -5 });
  });

  it("centres the board on the origin", () => {
    expect(worldOfScreenPixel({ x: 80, y: 44 })).toEqual({ x: 0, z: 0 });
  });

  it("finds the centre of a double-width cloud", () => {
    expect(worldOfSprite({ x: 8, y: 8 }, { width: 16, height: 8 })).toEqual({ x: -9, z: -5 });
  });

  it("maps a point of the floor back to the card beneath it", () => {
    const world = worldOfSprite(squareAnchor(Square.at(6, 13)), CARD_SIZE);

    expect(squareUnder(spriteOverWorld(world))).toBe(Square.at(6, 13));
  });

  it("knows the floor beyond the sea's cards", () => {
    expect([isOnBoard({ x: 3, z: 2 }), isOnBoard({ x: 11, z: 0 })]).toEqual([true, false]);
  });

  it("brings a point beyond the sea's cards back to the nearest point on them", () => {
    const pulledIn = nearestOnBoard({ x: 14, z: -8 });

    expect([isOnBoard(pulledIn), squareUnder(spriteOverWorld(pulledIn))]).toEqual([
      true,
      Square.at(0, 19),
    ]);
  });

  it("leaves a point on the sea's cards where it is", () => {
    expect(nearestOnBoard({ x: 3, z: 2 })).toEqual({ x: 3, z: 2 });
  });
});
