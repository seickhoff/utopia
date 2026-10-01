import {
  HARBOURS,
  PILOT_BOUNDS,
  PixelPoint,
  Square,
  squareAnchor,
  squareUnder,
} from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { BuildMenu } from "../src/app/build-menu.js";
import { BuildMenuControls } from "../src/input/build-menu-controls.js";
import { HandController } from "../src/input/hand-controller.js";
import { commandForKey } from "../src/input/key-map.js";
import { Steerer } from "../src/input/steerer.js";
import { NO_OPPONENT } from "../src/session/local-game-session.js";
import { localGameSession } from "../src/session/local-game.js";

const FRAME_MS = 1000 / 60;

/** A real solo game, played by the mouse (and keys) the way the browser plays it. */
function aMouseGame() {
  const session = localGameSession({
    options: { rounds: 3, roundSeconds: 120 },
    side: "left",
    seed: 12,
    opponent: () => NO_OPPONENT,
  });
  const controller = new HandController(() => {});
  controller.plugInto(session);
  const menu = new BuildMenu();
  const steerer = new Steerer(controller, menu);
  const keys = new BuildMenuControls(controller, menu);
  steerer.steerFor("left");
  let now = 0;
  const play = (seconds: number) => {
    for (let frame = 0; frame < seconds * 60; frame += 1) {
      now += FRAME_MS;
      session.advanceTo(now);
      steerer.onFrame(session.frame());
    }
  };
  play(0.1);
  const island = () => session.frame().current.islands.left;
  const occupantAt = (square: Square) =>
    session
      .frame()
      .current.board.squares.find((cell) => cell.row === square.row && cell.col === square.col)
      ?.occupant ?? "nothing";
  const razzes = () =>
    session.frame().events.filter((event) => event.type === "razzed" && event.side === "left");
  return { session, controller, steerer, menu, keys, play, island, occupantAt, razzes };
}

/** Somewhere inside a square, as a pointer would be. */
const within = (square: Square) => {
  const anchor = squareAnchor(square);
  return new PixelPoint(anchor.x + 2, anchor.y + 3);
};

/** A mouse game whose player has bought a fishing boat and taken it out of the harbour. */
function aSailingGame() {
  const game = aMouseGame();
  game.controller.pressKeypad(9);
  game.controller.pressKeypad("enter");
  game.steerer.click(clickOn(HARBOURS.left));
  game.play(0.2);
  return game;
}

/** Every heading the boat takes on its way to a square, each time it turns to a new one. */
function headingsWhile(
  game: ReturnType<typeof aMouseGame>,
  run: { seconds: number; shortOf: Square },
): string[] {
  const headings: string[] = [];
  for (let frame = 0; frame < run.seconds * 60; frame += 1) {
    game.play(1 / 60);
    const { x, y, vx, vy } = game.island().pilot;
    if (squareUnder(new PixelPoint(x, y)) === run.shortOf) break;
    const heading = `${vx},${vy}`;
    if ((vx !== 0 || vy !== 0) && heading !== headings.at(-1)) headings.push(heading);
  }
  return headings;
}

/** A click inside a square, made at some place on the screen. */
const clickOn = (square: Square) => ({ point: within(square), anchor: { x: 300, y: 200 } });

describe("Steerer", () => {
  it("snaps the cursor exactly onto the square under the pointer", () => {
    const game = aMouseGame();

    game.steerer.aim(within(Square.at(7, 5)));
    game.play(1 / 60);

    expect([game.island().pilot.x, game.island().pilot.y]).toEqual([48, 64]);
  });

  it("moves the cursor square by square as the pointer moves", () => {
    const game = aMouseGame();
    game.steerer.aim(within(Square.at(7, 5)));
    game.play(1 / 60);

    game.steerer.aim(within(Square.at(7, 6)));
    game.play(1 / 60);

    expect([game.island().pilot.x, game.island().pilot.y]).toEqual([56, 64]);
  });

  it("builds the chosen item at once where the player clicks their own land", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(6);

    game.steerer.click(clickOn(Square.at(7, 5)));
    game.play(2 / 60);

    expect(game.occupantAt(Square.at(7, 5))).toBe("house");
  });

  it("does not build where nothing is chosen", () => {
    const game = aMouseGame();

    game.steerer.click(clickOn(Square.at(7, 5)));
    game.play(4);

    expect(game.occupantAt(Square.at(7, 5))).toBe("nothing");
  });

  it("offers what can be built when the player clicks their own open land with nothing chosen", () => {
    const game = aMouseGame();

    game.steerer.click(clickOn(Square.at(7, 5)));
    game.play(2 / 60);

    expect(game.menu.offered()).toEqual({ square: { row: 7, col: 5 }, anchor: { x: 300, y: 200 } });
  });

  it("holds the cursor still while the menu is open", () => {
    const game = aMouseGame();
    game.steerer.click(clickOn(Square.at(7, 5)));
    game.play(2 / 60);

    game.steerer.aim(within(Square.at(7, 7)));
    game.play(2 / 60);

    expect([game.island().pilot.x, game.island().pilot.y]).toEqual([48, 64]);
  });

  it("closes the menu at a click anywhere else on the board, and does nothing more", () => {
    const game = aMouseGame();
    game.steerer.click(clickOn(Square.at(7, 5)));
    game.play(2 / 60);

    game.steerer.click(clickOn(Square.at(7, 7)));
    game.play(2 / 60);

    expect([game.menu.isOpen(), game.island().pilot.x]).toEqual([false, 48]);
  });

  it("buys a boat at once, whatever is clicked", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);

    game.steerer.click(clickOn(Square.at(1, 15)));
    game.play(0.1);

    expect(game.occupantAt(HARBOURS.left)).toBe("fishingBoat");
  });

  it("takes out the player's anchored boat when it is clicked", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);
    game.controller.pressKeypad("enter");

    game.steerer.click(clickOn(HARBOURS.left));
    game.play(2 / 60);

    expect(game.island().pilot.mode).toBe("sailing");
  });

  it("steers a boat it is sailing toward the pointer, at the boat's own speed", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);
    game.controller.pressKeypad("enter");
    game.steerer.click(clickOn(HARBOURS.left));
    game.play(0.1);

    game.steerer.aim(within(Square.at(10, 2)));
    game.play(0.5);

    expect(game.island().pilot.vy).toBe(10);
  });

  it("brings a boat home to the harbour and anchors it there, however the coast lies", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);
    game.controller.pressKeypad("enter");
    game.steerer.click(clickOn(HARBOURS.left));
    game.play(0.2);
    game.steerer.aim(within(Square.at(9, 2)));
    game.play(4);

    game.steerer.click(clickOn(HARBOURS.left));
    game.play(6);

    expect([game.occupantAt(HARBOURS.left), game.island().pilot.mode]).toEqual([
      "fishingBoat",
      "cursor",
    ]);
  });

  it("holds one heading down a straight run of open water", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);
    game.controller.pressKeypad("enter");
    game.steerer.click(clickOn(HARBOURS.left));
    game.play(0.2);
    game.steerer.aim(within(Square.at(9, 2)));
    game.play(4);

    game.steerer.aim(within(Square.at(9, 12)));
    const headings = headingsWhile(game, { seconds: 8, shortOf: Square.at(9, 12) });

    expect(headings.length).toBeLessThanOrEqual(2);
  });

  it("brings the boat right under the pointer once it is over the pointer's square", () => {
    const game = aSailingGame();
    game.steerer.aim(within(Square.at(1, 9)));
    game.play(12);
    const spot = squareAnchor(Square.at(1, 9));

    game.steerer.aim(spot);
    game.play(2);

    const { x, y } = game.island().pilot;
    expect(Math.max(Math.abs(x - spot.x), Math.abs(y - spot.y))).toBeLessThanOrEqual(1);
  });

  it("brings the boat right up to the edge of the sea when pointed past it", () => {
    const game = aSailingGame();
    game.steerer.aim(new PixelPoint(11, 43));
    game.play(8);

    game.steerer.aim(new PixelPoint(4, 44));
    game.play(2);

    expect(game.island().pilot.x).toBe(PILOT_BOUNDS.left);
  });

  it("sails round the island to a spot out of its sight, and anchors there", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);
    game.controller.pressKeypad("enter");
    game.steerer.click(clickOn(HARBOURS.left));
    game.play(0.2);

    game.steerer.click(clickOn(Square.at(9, 6)));
    game.play(12);

    expect(game.occupantAt(Square.at(9, 6))).toBe("fishingBoat");
  });

  it("leaves the cursor to the arrow keys while they are held", () => {
    const game = aMouseGame();
    commandForKey({ code: "ArrowDown", shiftKey: false }).press(game.controller);
    game.play(0.2);
    const before = game.island().pilot;

    game.steerer.aim(within(Square.at(1, 1)));
    game.play(1 / 60);

    expect(game.island().pilot.x).toBe(before.x);
  });
});

describe("BuildMenuControls", () => {
  const withMenuOpen = () => {
    const game = aMouseGame();
    game.steerer.click(clickOn(Square.at(7, 5)));
    game.play(2 / 60);
    return game;
  };

  it("builds an item on the offered square with its key, and closes the menu", () => {
    const game = withMenuOpen();

    game.keys.pressKeypad(6);
    game.play(2 / 60);

    expect([game.occupantAt(Square.at(7, 5)), game.menu.isOpen()]).toEqual(["house", false]);
  });

  it("buys from the menu's own buttons the same way", () => {
    const game = withMenuOpen();

    game.keys.buy(3);
    game.play(2 / 60);

    expect(game.occupantAt(Square.at(7, 5))).toBe("crop");
  });

  it("puts a boat in the harbour, not on the square", () => {
    const game = withMenuOpen();

    game.keys.buy(9);
    game.play(2 / 60);

    expect([game.occupantAt(HARBOURS.left), game.occupantAt(Square.at(7, 5))]).toEqual([
      "fishingBoat",
      "nothing",
    ]);
  });

  it("closes the menu on Clear without the cartridge's RAZZ", () => {
    const game = withMenuOpen();

    commandForKey({ code: "Backspace", shiftKey: false }).press(game.keys);
    game.play(1 / 60);

    expect([game.menu.isOpen(), game.razzes()]).toEqual([false, []]);
  });

  it("closes the menu when an arrow key moves the cursor away", () => {
    const game = withMenuOpen();

    commandForKey({ code: "ArrowRight", shiftKey: false }).press(game.keys);

    expect(game.menu.isOpen()).toBe(false);
  });

  it("passes keys straight to the controller while the menu is closed", () => {
    const game = aMouseGame();

    game.keys.pressKeypad(4);
    game.play(1 / 60);

    expect(game.island().selection).toBe("school");
  });
});

describe("Steerer under a finger", () => {
  const NORTH = 0;
  /** Out of the left harbour lies open water to the south; land is just north of it. */
  const SOUTH = 8;
  const pilotSquare = (game: ReturnType<typeof aMouseGame>) => {
    const { x, y } = game.island().pilot;
    return squareUnder(new PixelPoint(x, y));
  };

  it("sails a boat to where a finger taps, and keeps it out on the water there", () => {
    const game = aSailingGame();

    game.steerer.tap(clickOn(Square.at(9, 2)));
    game.play(6);

    expect([game.island().pilot.mode, pilotSquare(game)]).toEqual(["sailing", Square.at(9, 2)]);
  });

  it("drops anchor when the boat itself is tapped, handing back the cursor", () => {
    const game = aSailingGame();
    const { x, y } = game.island().pilot;

    game.steerer.tap({ point: new PixelPoint(x + 2, y - 1), anchor: { x: 300, y: 200 } });
    game.play(0.1);

    expect([game.island().pilot.mode, game.occupantAt(HARBOURS.left)]).toEqual([
      "cursor",
      "fishingBoat",
    ]);
  });

  it("takes out an anchored boat that is tapped", () => {
    const game = aMouseGame();
    game.controller.pressKeypad(9);
    game.controller.pressKeypad("enter");

    game.steerer.tap(clickOn(HARBOURS.left));
    game.play(2 / 60);

    expect(game.island().pilot.mode).toBe("sailing");
  });

  it("drives the boat the way a finger drags, wherever on the glass it landed", () => {
    const game = aSailingGame();

    game.steerer.drag({ point: "outside", heading: SOUTH });
    game.play(0.5);

    expect([game.island().pilot.vx, game.island().pilot.vy]).toEqual([0, 10]);
  });

  it("lets go of the boat once the finger driving it lifts", () => {
    const game = aSailingGame();
    game.steerer.drag({ point: "outside", heading: SOUTH });
    game.play(0.5);

    game.steerer.release();
    game.play(0.1);

    expect([game.island().pilot.vx, game.island().pilot.vy]).toEqual([0, 0]);
  });

  it("leads the cursor to the finger, square by square", () => {
    const game = aMouseGame();

    game.steerer.drag({ point: within(Square.at(7, 5)), heading: NORTH });
    game.play(1 / 60);

    expect([game.island().pilot.x, game.island().pilot.y]).toEqual([48, 64]);
  });
});
