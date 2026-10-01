import { HARBOURS, newGame, Square, squareAnchor, type GameEventSink } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { BuildMenu } from "../src/app/build-menu.js";
import { presentBuildMenu } from "../src/hud/build-menu-presenter.js";

const IGNORED: GameEventSink = { record: () => {} };
const OPEN_LAND = Square.at(7, 5);
const OFFER = { square: { row: 7, col: 5 }, anchor: { x: 420, y: 310 } };

/** A game with the player's cursor on an open square of their island, after any purchases made first. */
function aGameOnOpenLand(purchases: readonly { square: Square; key: number }[] = []) {
  const game = newGame({ options: { rounds: 3, roundSeconds: 120 }, seed: 4, events: IGNORED });
  game.start();
  purchases.forEach(({ square, key }) => {
    game.layCursor("left", squareAnchor(square));
    game.pressKey("left", key);
    game.pressKey("left", "enter");
  });
  game.layCursor("left", squareAnchor(OPEN_LAND));
  game.advance(1 / 20);
  return game;
}

const menuOf = (game: ReturnType<typeof aGameOnOpenLand>, offer = OFFER) =>
  presentBuildMenu({ snapshot: game.snapshot(), mine: "left", offer });

describe("presentBuildMenu", () => {
  it("opens where the player clicked", () => {
    const menu = menuOf(aGameOnOpenLand());

    expect([menu.open, menu.x, menu.y]).toEqual([true, 420, 310]);
  });

  it("offers the six buildings for the square, in keypad order, with their prices", () => {
    const here = menuOf(aGameOnOpenLand()).here;

    expect(here.map((choice) => `${choice.key} ${choice.name} ${choice.price}`)).toEqual([
      "1 Fort 50",
      "2 Factory 40",
      "3 Crops 3",
      "4 School 35",
      "5 Hospital 75",
      "6 Housing 60",
    ]);
  });

  it("offers boats and rebels too, saying where each goes", () => {
    const elsewhere = menuOf(aGameOnOpenLand()).elsewhere;

    expect(elsewhere.map((choice) => [choice.name, choice.where])).toEqual([
      ["Rebels", "Their island"],
      ["PT boat", "In harbour"],
      ["Fishing boat", "In harbour"],
    ]);
  });

  it("greys out what the player cannot afford, saying how much more gold it needs", () => {
    const game = aGameOnOpenLand([{ square: Square.at(7, 4), key: 5 }]);

    const here = menuOf(game).here;

    expect(here.map((choice) => [choice.name, choice.ready, choice.note])).toEqual([
      ["Fort", false, "Need 25 more"],
      ["Factory", false, "Need 15 more"],
      ["Crops", true, ""],
      ["School", false, "Need 10 more"],
      ["Hospital", false, "Need 50 more"],
      ["Housing", false, "Need 35 more"],
    ]);
  });

  it("gives each choice its terms: the price, and where it goes", () => {
    const { here, elsewhere } = menuOf(aGameOnOpenLand());

    expect([here[0].terms, elsewhere[1].terms]).toEqual(["50 gold", "40 gold, in harbour"]);
  });

  it("gives a choice the player cannot buy the reason as its terms", () => {
    const game = aGameOnOpenLand([{ square: Square.at(7, 4), key: 5 }]);

    expect(menuOf(game).here[4].terms).toBe("Need 50 more");
  });

  it("shows the gold the player has to spend", () => {
    expect(menuOf(aGameOnOpenLand()).gold).toBe("100");
  });

  it("greys out boats while the harbour is taken", () => {
    const game = aGameOnOpenLand([{ square: HARBOURS.left, key: 9 }]);

    const boats = menuOf(game).elsewhere.slice(1);

    expect(boats.map((choice) => [choice.ready, choice.note])).toEqual([
      [false, "Harbour busy"],
      [false, "Harbour busy"],
    ]);
  });

  it("stays closed while nothing is offered", () => {
    const menu = presentBuildMenu({
      snapshot: aGameOnOpenLand().snapshot(),
      mine: "left",
      offer: "closed",
    });

    expect(menu.open).toBe(false);
  });

  it("closes once the cursor has moved off the square", () => {
    const game = aGameOnOpenLand();
    game.layCursor("left", squareAnchor(Square.at(7, 6)));
    game.advance(1 / 20);

    expect(menuOf(game).open).toBe(false);
  });

  it("closes once something stands on the square", () => {
    const game = aGameOnOpenLand();
    game.pressKey("left", 3);
    game.pressKey("left", "enter");
    game.advance(1 / 20);

    expect(menuOf(game).open).toBe(false);
  });
});

describe("BuildMenu", () => {
  it("starts closed", () => {
    expect([new BuildMenu().isOpen(), new BuildMenu().offered()]).toEqual([false, "closed"]);
  });

  it("holds the offer it is given until dismissed", () => {
    const menu = new BuildMenu();
    menu.offer(OFFER);
    const opened = [menu.isOpen(), menu.offered()];

    menu.dismiss();

    expect([...opened, menu.isOpen()]).toEqual([true, OFFER, false]);
  });
});
