import { describe, expect, it } from "vitest";
import { ISLANDS } from "../src/board/island-map.js";
import { Square } from "../src/geometry/square.js";
import { aGame } from "./support/game-builder.js";
import { LoadedDice } from "./support/loaded-dice.js";

/**
 * The screenshot "Utopia: totals for the first round" shows the left island with a school and a
 * house, the right with a factory and a school and a rebel, and totals of 18 and 5.
 */
describe("the first round of the reference screenshot", () => {
  const firstRightSquare = ISLANDS.right[0].square;
  const played = () =>
    aGame()
      .withOptions({ rounds: 2, roundSeconds: 30 })
      .withFortune(new LoadedDice().next(29, 0))
      .started()
      .buy("left", "school", Square.at(3, 2))
      .buy("left", "house", Square.at(4, 2))
      .buy("right", "factory", Square.at(3, 11))
      .buy("right", "school", Square.at(4, 11))
      .playRound();

  it("totals 18 for the left and 5 for the right", () => {
    const game = played();

    expect([game.island("left").totalScore, game.island("right").totalScore]).toEqual([18, 5]);
  });

  it("grows the islands to 1027 and 1025 people", () => {
    const game = played();

    expect([game.island("left").population, game.island("right").population]).toEqual([1027, 1025]);
  });

  it("leaves the left with 15 gold and the right with 40", () => {
    const game = played();

    expect([game.island("left").gold, game.island("right").gold]).toEqual([15, 40]);
  });

  it("raises a rebel on the island that scored 5", () => {
    expect(played().occupantAt(firstRightSquare)).toBe("rebel");
  });

  it("keeps the island that scored 18 free of rebels", () => {
    expect(played().island("left").counts.rebel).toBe(0);
  });
});
