import {
  isBoat,
  squareUnder,
  type GameSnapshot,
  type KeypadKey,
  type PixelPoint,
  type Selection,
  type Side,
  type SquareSnapshot,
} from "@utopia/engine";

/**
 * What clicking the board asks for, once the cursor or boat has reached the click: a key pressed,
 * the quick-build menu offered for the square, or nothing.
 */
export type ClickAction = KeypadKey | "offer" | "none";

export interface Click {
  readonly snapshot: GameSnapshot;
  readonly side: Side;
  readonly point: PixelPoint;
  /** The item chosen, which may be newer than the snapshot. */
  readonly selection: Selection;
}

/** Items bought without the cursor: boats in the harbour, rebels on the other island. */
const BOUGHT_ANYWHERE = ["ptBoat", "fishingBoat", "rebel"];

/**
 * A click's meaning, as a player would press the keypad: buy the chosen item on your own empty
 * land (or, with nothing chosen, offer what could be built there), take out your own anchored
 * boat, or drop anchor on open water.
 */
export function clickAction(click: Click): ClickAction {
  const mode = click.snapshot.islands[click.side].pilot.mode;
  const content = contentAt(click);
  if (mode === "sailing") return isOpenWater(content) ? 0 : "none";
  if (mode !== "cursor") return "none";
  if (isOwnBoat(content, click.side)) return 0;
  const buildable = content.terrain === "land" && content.holder === click.side;
  if (!buildable || content.occupant !== "nothing") return "none";
  return click.selection === "none" ? "offer" : "enter";
}

function isOwnBoat(content: ClickedContent, side: Side): boolean {
  return content.terrain === "sea" && content.holder === side && isBoat(content.occupant);
}

/** Whether the chosen item is bought wherever the cursor is, so a click buys it at once. */
export function buysAtOnce(selection: Selection): boolean {
  return BOUGHT_ANYWHERE.includes(selection);
}

const OPEN_WATER = { terrain: "sea", holder: "nobody", occupant: "nothing" } as const;
type ClickedContent = Pick<SquareSnapshot, "terrain" | "holder" | "occupant">;

function contentAt(click: Click): ClickedContent {
  const square = squareUnder(click.point);
  const held = click.snapshot.board.squares.find(
    (cell) => cell.row === square.row && cell.col === square.col,
  );
  return held ?? OPEN_WATER;
}

function isOpenWater(content: ClickedContent): boolean {
  return content.terrain === "sea" && content.occupant === "nothing";
}
