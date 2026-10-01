import { newGame, type GameEvent, type GameEventSink } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { presentFinal } from "../src/hud/final-presenter.js";
import { presentHud } from "../src/hud/hud-presenter.js";
import { presentYearEnd, type RoundEnded } from "../src/hud/year-end-presenter.js";

const NAMES = { left: "Your island", right: "The computer" } as const;

function aGame(options = { rounds: 4, roundSeconds: 30 }) {
  const events: GameEvent[] = [];
  const sink: GameEventSink = { record: (event) => events.push(event) };
  const game = newGame({ options, seed: 9, events: sink });
  game.start();
  return { game, events };
}

describe("presentHud", () => {
  const hudOf = (game = aGame().game, lastRazz = "none" as const) =>
    presentHud({ snapshot: game.snapshot(), mine: "left", names: NAMES, lastRazz });

  it("shows both islands' gold and people", () => {
    expect(hudOf().panels.map((panel) => [panel.title, panel.gold, panel.population])).toEqual([
      ["Your island", "100", "1,000"],
      ["The computer", "100", "1,000"],
    ]);
  });

  it("shows the year and the time left", () => {
    expect(hudOf().clock).toEqual({ year: "Year 1 of 4", time: "0:30", urgent: false });
  });

  it("marks the last five seconds as urgent", () => {
    const { game } = aGame();
    game.advance(26);

    expect(hudOf(game).clock).toMatchObject({ time: "0:04", urgent: true });
  });

  it("lists the nine items in keypad order with their prices", () => {
    expect(hudOf().palette.map((item) => `${item.key} ${item.name} ${item.price}`)).toEqual([
      "1 Fort 50",
      "2 Factory 40",
      "3 Crops 3",
      "4 School 35",
      "5 Hospital 75",
      "6 Housing 60",
      "7 Rebels 30",
      "8 PT boat 40",
      "9 Fishing boat 25",
    ]);
  });

  it("draws each item with the cartridge's picture in the overlay's colour", () => {
    const crops = hudOf().palette.find((item) => item.name === "Crops");

    expect([crops?.picture.split("/")[3], crops?.colour]).toEqual(["########", "#386b3f"]);
  });

  it("marks what the treasury cannot afford", () => {
    const { game } = aGame();
    game.pressKey("left", 8);
    game.pressKey("left", "enter");

    const hospital = hudOf(game).palette.find((item) => item.name === "Hospital");

    expect(hospital?.affordable).toBe(false);
  });

  it("highlights the selected item", () => {
    const { game } = aGame();
    game.pressKey("left", 6);

    expect(
      hudOf(game)
        .palette.filter((item) => item.selected)
        .map((item) => item.name),
    ).toEqual(["Housing"]);
  });

  it("explains a RAZZ", () => {
    const hud = presentHud({
      snapshot: aGame().game.snapshot(),
      mine: "left",
      names: NAMES,
      lastRazz: "cannotAfford",
    });

    expect(hud.message).toBe("Not enough gold");
  });
});

describe("presentYearEnd", () => {
  const atYearEnd = (seconds: number) => {
    const { game, events } = aGame();
    game.pressKey("left", 4);
    game.pressKey("left", "enter");
    game.advance(seconds);
    const report = events.find((event): event is RoundEnded => event.type === "roundEnded");
    if (report === undefined) throw new Error("No round ended");
    return presentYearEnd({ snapshot: game.snapshot(), report });
  };

  it("shows nothing while a turn is played", () => {
    const { game } = aGame();

    expect(game.snapshot().phase).toBe("playing");
  });

  it("reports the round's sums while the scores are up", () => {
    const view = atYearEnd(30);

    expect([
      view.shown,
      view.title,
      view.lines.find((line) => line.label === "Round score"),
    ]).toEqual(["scores", "Year 1 report", { label: "Round score", left: "0", right: "0" }]);
  });

  it("reports the running totals after", () => {
    const view = atYearEnd(33);

    expect([view.shown, view.lines[0].label]).toEqual(["totals", "Total score"]);
  });
});

describe("presentFinal", () => {
  const finished = () => {
    const { game } = aGame({ rounds: 1, roundSeconds: 30 });
    game.advance(40);
    return game.snapshot();
  };

  it("calls a tie between rivals", () => {
    expect(presentFinal({ snapshot: finished(), mine: "left", rivalled: true }).headline).toBe(
      "A dead heat: the islands are tied",
    );
  });

  it("judges a governor alone by their average score", () => {
    expect(presentFinal({ snapshot: finished(), mine: "left", rivalled: false }).headline).toBe(
      "Your term is over: the people have spoken",
    );
  });
});
