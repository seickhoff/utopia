import { COLOURS, newGame, squareAnchor, Square, type GameEventSink } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { PALETTE_WORDS } from "../src/art/palette.js";
import { composeBacktab } from "../src/classic/backtab.js";
import { ClassicPixels, FRAME_WIDTH, composeFrame } from "../src/classic/pixel-frame.js";
import { GOLD_READOUTS, readoutsWhileHeld, statusRuns } from "../src/classic/status-row.js";

const IGNORED: GameEventSink = { record: () => {} };

function aStartedGame() {
  const game = newGame({ options: { rounds: 5, roundSeconds: 45 }, seed: 3, events: IGNORED });
  game.start();
  return game;
}

function pixelAt(canvas: ClassicPixels, point: { x: number; scanline: number }): number {
  return canvas.pixels[point.scanline * FRAME_WIDTH + point.x];
}

describe("composeBacktab", () => {
  it("shows open water as blue", () => {
    const cells = composeBacktab(aStartedGame().snapshot());

    expect(cells[0].background).toBe(COLOURS.blue);
  });

  it("draws land in tan on blue", () => {
    const cell = composeBacktab(aStartedGame().snapshot())[3 * 20 + 2];

    expect([cell.foreground, cell.background]).toEqual([COLOURS.tan, COLOURS.blue]);
  });

  it("draws a built square in its item's colour on tan", () => {
    const game = aStartedGame();
    game.layCursor("left", squareAnchor(Square.at(3, 2)));
    game.pressKey("left", 5);
    game.pressKey("left", "enter");

    const cell = composeBacktab(game.snapshot())[3 * 20 + 2];

    expect([cell.foreground, cell.background]).toEqual([COLOURS.red, COLOURS.tan]);
  });

  it("draws an anchored boat in its side's colour", () => {
    const game = aStartedGame();
    game.pressKey("right", 9);
    game.pressKey("right", "enter");

    expect(composeBacktab(game.snapshot())[4 * 20 + 18].foreground).toBe(COLOURS.red);
  });
});

describe("statusRuns", () => {
  it("shows gold, turns left and seconds while playing", () => {
    const texts = statusRuns(aStartedGame().snapshot(), GOLD_READOUTS).map((run) => run.text);

    expect(texts).toEqual([" 100", " 5", "  45", " 100"]);
  });

  it("shows the population while its side button is held", () => {
    const runs = statusRuns(aStartedGame().snapshot(), { left: "population", right: "gold" });

    expect(runs[0].text).toBe("1000");
  });

  it("shows each side's round score with SCORES when a turn ends", () => {
    const game = aStartedGame();
    game.advance(45);

    const texts = statusRuns(game.snapshot(), GOLD_READOUTS).map((run) => run.text);

    expect(texts).toEqual(["   0", "SCORES", "   0"]);
  });

  it("prints FINAL SCORE when the term is over", () => {
    const game = newGame({ options: { rounds: 1, roundSeconds: 30 }, seed: 1, events: IGNORED });
    game.start();
    game.advance(40);

    const texts = statusRuns(game.snapshot(), GOLD_READOUTS).map((run) => run.text);

    expect(texts).toContain("FINAL  SCORE");
  });
});

describe("readoutsWhileHeld", () => {
  it("shows the gold in both corners while no side button is held", () => {
    expect(readoutsWhileHeld(new Set())).toEqual(GOLD_READOUTS);
  });

  it("shows the held button's figure in both corners, so the islands compare", () => {
    expect(readoutsWhileHeld(new Set(["census"]))).toEqual({
      left: "population",
      right: "population",
    });
  });
});

describe("composeFrame", () => {
  const framed = (game = aStartedGame()) => {
    const canvas = new ClassicPixels();
    composeFrame({ snapshot: game.snapshot(), readouts: GOLD_READOUTS }, canvas);
    return canvas;
  };

  it("paints open water blue", () => {
    expect(pixelAt(framed(), { x: 0, scanline: 0 })).toBe(PALETTE_WORDS[COLOURS.blue]);
  });

  it("paints solid land tan, on both of a pixel's scanlines", () => {
    const canvas = framed();

    expect([
      pixelAt(canvas, { x: 16, scanline: 48 }),
      pixelAt(canvas, { x: 16, scanline: 49 }),
    ]).toEqual([PALETTE_WORDS[COLOURS.tan], PALETTE_WORDS[COLOURS.tan]]);
  });

  it("paints the left governor's cursor in dark green where it starts", () => {
    expect(pixelAt(framed(), { x: 34, scanline: 140 })).toBe(PALETTE_WORDS[COLOURS.darkGreen]);
  });

  it("prints the seconds left in yellow on the status row", () => {
    const canvas = framed();
    const statusRow = Array.from({ length: 16 }, (_, row) =>
      Array.from({ length: 32 }, (__, column) =>
        pixelAt(canvas, { x: 72 + column, scanline: 176 + row }),
      ),
    ).flat();

    expect(statusRow).toContain(PALETTE_WORDS[COLOURS.yellow]);
  });
});
