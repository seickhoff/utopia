import { Square, newGame, squareAnchor, type Game, type Side } from "@utopia/engine";
import { ClassicPixels, FRAME_HEIGHT, FRAME_WIDTH, composeFrame } from "./pixel-frame.js";
import { BORDER, SCREEN_HEIGHT, SCREEN_WIDTH, composeBorder } from "./screen.js";
import { GOLD_READOUTS } from "./status-row.js";

/** A game whose fourteenth second has rain and a storm over the channel, pirates and fish. */
const PICTURE_SEED = 6;
const PICTURE_SECONDS = 14;
const TICK_SECONDS = 0.05;

/** What each governor has built by then: the key bought, on the nth open square of their island. */
const BUILT: readonly { side: Side; key: number; square: number }[] = [
  { side: "left", key: 6, square: 8 },
  { side: "left", key: 3, square: 3 },
  { side: "left", key: 3, square: 4 },
  { side: "left", key: 3, square: 12 },
  { side: "left", key: 9, square: 0 },
  { side: "right", key: 4, square: 6 },
  { side: "right", key: 2, square: 14 },
  { side: "right", key: 3, square: 2 },
  { side: "right", key: 3, square: 3 },
  { side: "right", key: 3, square: 20 },
];

/**
 * The title screen's picture: a moment of play as the Intellivision drew it, border and all,
 * as an image the HUD can show. Drawn once, so the title costs no frames.
 */
export function titlePicture(): string {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw on a canvas");
  const screen = context.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
  new Uint32Array(screen.data.buffer).set(screenPixels(aMomentOfPlay()));
  context.putImageData(screen, 0, 0);
  return canvas.toDataURL();
}

function aMomentOfPlay(): Game {
  const game = newGame({
    options: { rounds: 10, roundSeconds: 120 },
    seed: PICTURE_SEED,
    events: { record: () => {} },
  });
  game.start();
  BUILT.forEach((purchase) => build(game, purchase));
  for (let elapsed = 0; elapsed < PICTURE_SECONDS; elapsed += TICK_SECONDS)
    game.advance(TICK_SECONDS);
  return game;
}

function build(game: Game, purchase: { side: Side; key: number; square: number }): void {
  const { side, key } = purchase;
  const open = game
    .snapshot()
    .board.squares.filter(
      (cell) => cell.terrain === "land" && cell.holder === side && cell.occupant === "nothing",
    );
  const cell = open[purchase.square];
  game.layCursor(side, squareAnchor(Square.at(cell.row, cell.col)));
  game.pressKey(side, key);
  game.pressKey(side, "enter");
}

/** The playfield inside its blue border. */
function screenPixels(game: Game): Uint32Array {
  const playfield = new ClassicPixels();
  composeFrame({ snapshot: game.snapshot(), readouts: GOLD_READOUTS }, playfield);
  const screen = composeBorder([]);
  for (let row = 0; row < FRAME_HEIGHT; row += 1) {
    const from = playfield.pixels.subarray(row * FRAME_WIDTH, (row + 1) * FRAME_WIDTH);
    screen.set(from, (row + BORDER.down) * SCREEN_WIDTH + BORDER.across);
  }
  return screen;
}
