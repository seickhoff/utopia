import { describe, expect, it } from "vitest";
import { HARBOURS, ISLANDS } from "../src/board/island-map.js";
import { Square } from "../src/geometry/square.js";
import { DEFAULT_RULES } from "../src/game/game-rules.js";
import { aGame } from "./support/game-builder.js";
import { LoadedDice } from "./support/loaded-dice.js";

const LEFT_LAND = Square.at(3, 2);
const RIGHT_LAND = Square.at(3, 11);
const OPEN_WATER = Square.at(9, 9);
const EAST = 4;
const SOUTH = 8;

describe("a game's phases", () => {
  it("waits to be started", () => {
    expect(aGame().ready().snapshot().phase).toBe("ready");
  });

  it("plays round 1 once started, with the whole turn to go", () => {
    const snapshot = aGame().withOptions({ roundSeconds: 45 }).started().snapshot();

    expect(snapshot).toMatchObject({ phase: "playing", round: 1, secondsLeft: 45 });
  });

  it("counts down the turn a second at a time", () => {
    expect(aGame().started().play(1).snapshot().secondsLeft).toBe(29);
  });

  it("shows the scores when the turn runs out", () => {
    expect(aGame().started().playRound().snapshot().phase).toBe("scores");
  });

  it("shows the totals after the scores", () => {
    expect(aGame().started().playRound().play(2.5).snapshot().phase).toBe("totals");
  });

  it("plays the next round after the totals", () => {
    const snapshot = aGame().started().playRound().playYearEnd().snapshot();

    expect(snapshot).toMatchObject({ phase: "playing", round: 2, roundsLeft: 2, secondsLeft: 30 });
  });

  it("ends after the last round's totals", () => {
    const game = aGame().withOptions({ rounds: 1 }).started().playRound().playYearEnd();

    expect(game.snapshot().phase).toBe("over");
  });

  it("announces the final totals", () => {
    const game = aGame().withOptions({ rounds: 1 }).started().playRound().playYearEnd();

    expect(game.events.ofType("gameOver")).toEqual([
      { type: "gameOver", totals: { left: 0, right: 0 } },
    ]);
  });

  it("ignores the keypad while the scores are up", () => {
    const game = aGame().started().playRound().buy("left", "fort", LEFT_LAND);

    expect(game.island("left").gold).toBe(110);
  });
});

describe("buying", () => {
  it("builds on the governor's own empty land under the cursor", () => {
    const game = aGame().started().buy("left", "hospital", LEFT_LAND);

    expect([game.occupantAt(LEFT_LAND), game.island("left").gold]).toEqual(["hospital", 25]);
  });

  it("tells everyone what was bought and where", () => {
    const game = aGame().started().buy("right", "crop", RIGHT_LAND);

    expect(game.events.ofType("itemBought")).toEqual([
      { type: "itemBought", side: "right", item: "crop", cell: { row: 3, col: 11 } },
    ]);
  });

  it("razzes building on the other island", () => {
    const game = aGame().started().buy("left", "fort", RIGHT_LAND);

    expect(game.events.ofType("razzed").map((razz) => razz.reason)).toEqual(["notYourLand"]);
  });

  it("razzes building on water", () => {
    const game = aGame().started().buy("left", "fort", OPEN_WATER);

    expect(game.events.ofType("razzed").map((razz) => razz.reason)).toEqual(["notYourLand"]);
  });

  it("razzes building where something already stands", () => {
    const game = aGame().started().buy("left", "crop", LEFT_LAND).buy("left", "crop", LEFT_LAND);

    expect(game.events.ofType("razzed").map((razz) => razz.reason)).toEqual(["occupied"]);
  });

  it("razzes what the treasury cannot afford, and charges nothing", () => {
    const game = aGame()
      .started()
      .buy("left", "hospital", LEFT_LAND)
      .buy("left", "hospital", Square.at(4, 2));

    expect([game.events.ofType("razzed")[0].reason, game.island("left").gold]).toEqual([
      "cannotAfford",
      25,
    ]);
  });

  it("forgets the selection on a razz", () => {
    const game = aGame().started().buy("left", "fort", OPEN_WATER);

    expect(game.island("left").selection).toBe("none");
  });

  it("shows the selection while it is pending", () => {
    expect(aGame().started().press("left", 6).island("left").selection).toBe("house");
  });

  it("launches a boat in the governor's harbour", () => {
    const game = aGame().started().buy("right", "fishingBoat");

    expect(game.occupantAt(HARBOURS.right)).toBe("fishingBoat");
  });

  it("razzes a boat while the harbour holds one", () => {
    const game = aGame().started().buy("right", "ptBoat").buy("right", "fishingBoat");

    expect(game.events.ofType("razzed").map((razz) => razz.reason)).toEqual(["harbourBusy"]);
  });

  it("counts boats anchored in the harbour", () => {
    expect(aGame().started().buy("left", "fishingBoat").island("left").counts.fishingBoat).toBe(1);
  });
});

describe("buying rebels", () => {
  it("lands them on the other island, destroying what stood there", () => {
    const target = ISLANDS.right[0].square;
    const game = aGame()
      .withFortune(new LoadedDice().next(29, 0))
      .started()
      .buy("right", "school", target)
      .buy("left", "rebel");

    expect(game.events.ofType("rebelsLanded")).toEqual([
      {
        type: "rebelsLanded",
        side: "right",
        cell: { row: 2, col: 10 },
        destroyed: "school",
        cause: "bought",
      },
    ]);
  });

  it("razzes, charging nothing, when forts guard every square (ROM bug: paid for nothing)", () => {
    const game = aGame().withRules(richRules()).started();
    for (const [row, col] of [
      [3, 2],
      [5, 2],
      [6, 4],
      [8, 4],
      [7, 7],
      [8, 10],
    ]) {
      game.buy("left", "fort", Square.at(row, col));
    }

    game.buy("right", "rebel");

    expect([game.events.ofType("razzed")[0]?.reason, game.island("right").gold]).toEqual([
      "noRebelSite",
      500,
    ]);
  });
});

describe("the end of a round", () => {
  it("withers each crop on a roll of 0 in 3", () => {
    const [first, second] = ISLANDS.left.map((land) => land.square);
    const game = aGame()
      .withFortune(new LoadedDice().next(3, 0).next(3, 2))
      .started()
      .buy("left", "crop", first)
      .buy("left", "crop", second)
      .playRound();

    expect([game.occupantAt(first), game.occupantAt(second)]).toEqual(["nothing", "crop"]);
  });

  it("takes a withered crop from its own side's count (ROM bug L_5B78 charged the left)", () => {
    const firstRightSquare = ISLANDS.right[0].square;
    const game = aGame()
      .withFortune(new LoadedDice().next(3, 2).next(3, 0))
      .started()
      .buy("left", "crop", LEFT_LAND)
      .buy("right", "crop", firstRightSquare)
      .buy("right", "crop", RIGHT_LAND)
      .playRound();

    expect([game.island("left").counts.crop, game.island("right").counts.crop]).toEqual([1, 1]);
  });

  it("reports the withered crops", () => {
    const [first] = ISLANDS.left.map((land) => land.square);
    const game = aGame()
      .withFortune(new LoadedDice().next(3, 0))
      .started()
      .buy("left", "crop", first)
      .playRound();

    expect(game.events.ofType("roundEnded")[0].reports.left.witheredCrops).toEqual([
      { row: 2, col: 2 },
    ]);
  });

  it("disperses the first rebel when the score rises by 10", () => {
    const rebelSquare = ISLANDS.right[0].square;
    const game = aGame()
      .withFortune(new LoadedDice().next(29, 0))
      .started()
      .playRound()
      .playYearEnd()
      .buy("right", "house", Square.at(3, 11))
      .buy("right", "school", Square.at(4, 11))
      .playRound();

    expect(game.occupantAt(rebelSquare)).toBe("nothing");
  });
});

describe("boats", () => {
  it("are taken out by pressing 0 over them", () => {
    const game = aGame().started().buy("left", "fishingBoat").cursorTo("left", HARBOURS.left);

    game.press("left", 0);

    expect([game.occupantAt(HARBOURS.left), game.island("left").pilot.mode]).toEqual([
      "nothing",
      "sailing",
    ]);
  });

  it("still count while sailed", () => {
    const game = aGame().started().buy("left", "fishingBoat").cursorTo("left", HARBOURS.left);

    game.press("left", 0);

    expect(game.island("left").counts.fishingBoat).toBe(1);
  });

  it("cannot be taken from the other side", () => {
    const game = aGame().started().buy("left", "fishingBoat").cursorTo("right", HARBOURS.left);

    game.press("right", 0);

    expect(game.events.ofType("razzed").map((razz) => razz.reason)).toEqual(["noBoatHere"]);
  });

  it("anchor on open water with 0", () => {
    const game = aGame().started().buy("left", "ptBoat").cursorTo("left", HARBOURS.left);
    game.press("left", 0).sail("left", { direction: SOUTH, seconds: 1.5 });

    game.press("left", 0);

    expect([game.occupantAt(Square.at(8, 2)), game.island("left").pilot.mode]).toEqual([
      "ptBoat",
      "cursor",
    ]);
  });

  it("leave the cursor at rest when a boat is anchored with way on it (a fix: it drifted off)", () => {
    const game = aGame().started().buy("left", "ptBoat").cursorTo("left", HARBOURS.left);
    game.press("left", 0).disc("left", SOUTH).play(1);
    game.press("left", 0);
    const { x, y } = game.island("left").pilot;

    game.play(1);

    expect(game.island("left").pilot).toMatchObject({ mode: "cursor", x, y, vx: 0, vy: 0 });
  });

  it("are stopped short of land by the sand bars", () => {
    const game = aGame().started().buy("left", "ptBoat").cursorTo("left", HARBOURS.left);
    game.press("left", 0).disc("left", EAST).play(1);

    expect(game.island("left").pilot).toMatchObject({ x: 23, vx: 0 });
  });

  it("cannot anchor where a boat already lies", () => {
    const game = aGame().started().buy("left", "ptBoat").cursorTo("left", HARBOURS.left);
    game.press("left", 0).buy("left", "fishingBoat");

    game.press("left", 0);

    expect(game.events.ofType("razzed").map((razz) => razz.reason)).toEqual(["cannotAnchorHere"]);
  });
});

function richRules() {
  return { ...DEFAULT_RULES, startingGold: 500 };
}
