import {
  HARBOURS,
  PixelPoint,
  isBoat,
  keyOf,
  priceOf,
  squareUnder,
  type GameSnapshot,
  type ItemKind,
  type Side,
} from "@utopia/engine";
import {
  NO_BUILD_MENU,
  type BuildChoiceViewModel,
  type BuildMenuViewModel,
  type BuildOffer,
} from "./game-view.js";
import { ITEM_NAMES, itemArt } from "./hud-presenter.js";

/** What stands on the square itself, in keypad order. */
const HERE: readonly ItemKind[] = ["fort", "factory", "crop", "school", "hospital", "house"];
/** What is bought from anywhere: rebels on the other island, boats in the harbour. */
const ELSEWHERE: readonly ItemKind[] = ["rebel", "ptBoat", "fishingBoat"];

const WHERE: Readonly<Record<ItemKind, string>> = {
  fort: "",
  factory: "",
  crop: "",
  school: "",
  hospital: "",
  house: "",
  rebel: "Their island",
  ptBoat: "In harbour",
  fishingBoat: "In harbour",
};

export interface BuildMenuInput {
  readonly snapshot: GameSnapshot;
  readonly mine: Side;
  readonly offer: BuildOffer | "closed";
}

/**
 * The quick-build menu for the square the player clicked: every item with its price, those the
 * player cannot buy greyed out with the reason (the gold still needed, or a busy harbour). It
 * closes itself once the offer no longer stands.
 */
export function presentBuildMenu(input: BuildMenuInput): BuildMenuViewModel {
  const { snapshot, mine, offer } = input;
  if (offer === "closed" || !offerStands({ snapshot, mine, offer })) return NO_BUILD_MENU;
  const gold = snapshot.islands[mine].gold;
  const harbourBusy = isTaken({ snapshot, row: HARBOURS[mine].row, col: HARBOURS[mine].col });
  const choice = (kind: ItemKind) =>
    choiceOf({ kind, gold, blocked: isBoat(kind) && harbourBusy ? "Harbour busy" : "" });
  return {
    open: true,
    x: offer.anchor.x,
    y: offer.anchor.y,
    gold: String(gold),
    here: HERE.map(choice),
    elsewhere: ELSEWHERE.map(choice),
  };
}

interface Standing {
  readonly snapshot: GameSnapshot;
  readonly mine: Side;
  readonly offer: BuildOffer;
}

/** The offer stands while the game is on, the cursor rests on the square, and the square is still the player's and empty. */
function offerStands(standing: Standing): boolean {
  const { snapshot, mine, offer } = standing;
  const pilot = snapshot.islands[mine].pilot;
  const under = squareUnder(new PixelPoint(pilot.x, pilot.y));
  const resting = under.row === offer.square.row && under.col === offer.square.col;
  const square = snapshot.board.squares.find(
    (cell) => cell.row === offer.square.row && cell.col === offer.square.col,
  );
  const open =
    square?.terrain === "land" && square.holder === mine && square.occupant === "nothing";
  return snapshot.phase === "playing" && pilot.mode === "cursor" && resting && open;
}

function isTaken(at: { snapshot: GameSnapshot; row: number; col: number }): boolean {
  return at.snapshot.board.squares.some(
    (cell) => cell.row === at.row && cell.col === at.col && cell.occupant !== "nothing",
  );
}

function choiceOf(item: { kind: ItemKind; gold: number; blocked: string }): BuildChoiceViewModel {
  const { kind, gold, blocked } = item;
  const shortBy = priceOf(kind) - gold;
  const note = blocked !== "" ? blocked : shortBy > 0 ? `Need ${shortBy} more` : "";
  return {
    key: keyOf(kind),
    name: ITEM_NAMES[kind],
    price: String(priceOf(kind)),
    ...itemArt(kind),
    ready: note === "",
    note,
    where: WHERE[kind],
    terms: termsOf({ kind, note }),
  };
}

/** What the ring's middle says under the name while the pointer heads for a choice. */
function termsOf(choice: { kind: ItemKind; note: string }): string {
  const { kind, note } = choice;
  if (note !== "") return note;
  const where = WHERE[kind] === "" ? "" : `, ${WHERE[kind].toLowerCase()}`;
  return `${priceOf(kind)} gold${where}`;
}
