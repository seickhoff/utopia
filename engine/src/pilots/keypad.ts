import { itemOnKey, type ItemKind } from "../board/item-kind.js";

/** The hand controller's keypad: digits 0-9, Clear and Enter. */
export type KeypadKey = number | "clear" | "enter";
/** The item a governor has keyed in and not yet bought or cleared. */
export type Selection = ItemKind | "none";

export const NO_SELECTION = "none";
export const BOAT_KEY = 0;

export type RazzReason =
  | "selectionPending"
  | "nothingSelected"
  | "cannotAfford"
  | "notYourLand"
  | "occupied"
  | "harbourBusy"
  | "noRebelSite"
  | "noBoatHere"
  | "cannotAnchorHere"
  | "sinking";

/** Port for whoever answers the keypad: the game, which buys, razzes and handles boats. */
export interface KeypadResponder {
  selected(item: ItemKind): void;
  cancelled(): void;
  ordered(item: ItemKind): void;
  razzed(reason: RazzReason): void;
  boatKey(): void;
}

/** What a key press asks for; it answers to a responder without anyone switching on its kind. */
export interface KeypadAction {
  readonly kind: "selected" | "cancelled" | "ordered" | "razzed" | "boatKey";
  answer(responder: KeypadResponder): void;
}

class Selected implements KeypadAction {
  readonly kind = "selected";
  constructor(readonly item: ItemKind) {}
  answer(responder: KeypadResponder): void {
    responder.selected(this.item);
  }
}

class Cancelled implements KeypadAction {
  readonly kind = "cancelled";
  answer(responder: KeypadResponder): void {
    responder.cancelled();
  }
}

class Ordered implements KeypadAction {
  readonly kind = "ordered";
  constructor(readonly item: ItemKind) {}
  answer(responder: KeypadResponder): void {
    responder.ordered(this.item);
  }
}

class Razzed implements KeypadAction {
  readonly kind = "razzed";
  constructor(readonly reason: RazzReason) {}
  answer(responder: KeypadResponder): void {
    responder.razzed(this.reason);
  }
}

class BoatKey implements KeypadAction {
  readonly kind = "boatKey";
  answer(responder: KeypadResponder): void {
    responder.boatKey();
  }
}

export interface KeypadStep {
  readonly selection: Selection;
  readonly action: KeypadAction;
}

/** KEYPAD_INP: what a key press does to a governor's selection. */
export function keypadStep(selection: Selection, key: KeypadKey): KeypadStep {
  if (key === BOAT_KEY) return { selection, action: new BoatKey() };
  if (typeof key === "number") return digitStep(selection, itemOnKey(key));
  if (selection === NO_SELECTION) return razzed("nothingSelected");
  return { selection: NO_SELECTION, action: settled(selection, key) };
}

function digitStep(selection: Selection, item: ItemKind): KeypadStep {
  if (selection !== NO_SELECTION) return razzed("selectionPending");
  return { selection: item, action: new Selected(item) };
}

function settled(item: ItemKind, key: "clear" | "enter"): KeypadAction {
  return key === "enter" ? new Ordered(item) : new Cancelled();
}

/** Every RAZZ also wipes the selection (L_5941). */
function razzed(reason: RazzReason): KeypadStep {
  return { selection: NO_SELECTION, action: new Razzed(reason) };
}
