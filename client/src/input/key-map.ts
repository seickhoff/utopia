import type { KeypadKey } from "@utopia/engine";
import type { SideButton } from "../board/controller.js";

export type Arrow = "up" | "down" | "left" | "right";

/** Port for whoever holds the hand controller a key stands in for. */
export interface ControllerHands {
  pressKeypad(key: KeypadKey): void;
  /** Chooses an item and buys it at once: a keyboard shortcut for the digit then Enter. */
  quickBuy(key: number): void;
  holdArrow(arrow: Arrow): void;
  releaseArrow(arrow: Arrow): void;
  holdSideButton(button: SideButton): void;
  releaseSideButton(button: SideButton): void;
}

/** What a key on the computer's keyboard stands for on the Intellivision hand controller. */
export interface KeyCommand {
  readonly kind: "keypad" | "quickBuy" | "arrow" | "sideButton" | "none";
  press(hands: ControllerHands): void;
  release(hands: ControllerHands): void;
}

/** The parts of a keyboard event the map reads: the physical key, so any layout works. */
export type KeyStroke = Pick<KeyboardEvent, "code" | "shiftKey">;

class KeypadPress implements KeyCommand {
  readonly kind = "keypad";
  constructor(readonly key: KeypadKey) {}
  press(hands: ControllerHands): void {
    hands.pressKeypad(this.key);
  }
  release(): void {}
}

class QuickBuy implements KeyCommand {
  readonly kind = "quickBuy";
  constructor(readonly key: number) {}
  press(hands: ControllerHands): void {
    hands.quickBuy(this.key);
  }
  release(): void {}
}

class ArrowHold implements KeyCommand {
  readonly kind = "arrow";
  constructor(readonly arrow: Arrow) {}
  press(hands: ControllerHands): void {
    hands.holdArrow(this.arrow);
  }
  release(hands: ControllerHands): void {
    hands.releaseArrow(this.arrow);
  }
}

class SideButtonHold implements KeyCommand {
  readonly kind = "sideButton";
  constructor(readonly button: SideButton) {}
  press(hands: ControllerHands): void {
    hands.holdSideButton(this.button);
  }
  release(hands: ControllerHands): void {
    hands.releaseSideButton(this.button);
  }
}

/** Special Case: a key that stands for nothing. */
export const NO_COMMAND: KeyCommand = { kind: "none", press: () => {}, release: () => {} };

const DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ITEM_CODES: Readonly<Record<string, number>> = Object.fromEntries(
  DIGITS.flatMap((digit) => [
    [`Digit${digit}`, digit],
    [`Numpad${digit}`, digit],
  ]),
);

const OTHER_KEYPAD_CODES: Readonly<Record<string, KeypadKey>> = {
  Digit0: 0,
  Numpad0: 0,
  Space: 0,
  Enter: "enter",
  NumpadEnter: "enter",
  Backspace: "clear",
  Delete: "clear",
  NumpadDecimal: "clear",
};

const ARROW_CODES: Readonly<Record<string, Arrow>> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const SIDE_BUTTON_CODES: Readonly<Record<string, SideButton>> = {
  KeyT: "total",
  KeyC: "census",
  KeyR: "round",
};

export function commandForKey(stroke: KeyStroke): KeyCommand {
  const { code } = stroke;
  if (code in ITEM_CODES) return itemCommand(stroke);
  if (code in OTHER_KEYPAD_CODES) return new KeypadPress(OTHER_KEYPAD_CODES[code]);
  if (code in ARROW_CODES) return new ArrowHold(ARROW_CODES[code]);
  if (code in SIDE_BUTTON_CODES) return new SideButtonHold(SIDE_BUTTON_CODES[code]);
  return NO_COMMAND;
}

function itemCommand(stroke: KeyStroke): KeyCommand {
  const digit = ITEM_CODES[stroke.code];
  return stroke.shiftKey ? new QuickBuy(digit) : new KeypadPress(digit);
}
