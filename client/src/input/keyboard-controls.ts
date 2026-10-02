import type { ViewAngle } from "../app/view-angle.js";
import type { GameSession } from "../session/game-session.js";
import type { HandController } from "./hand-controller.js";
import { commandForKey, type ControllerHands } from "./key-map.js";
import { viewTurnForKey } from "./view-keys.js";

type KeyTarget = Pick<Window, "addEventListener" | "removeEventListener">;

/** What the keyboard plays: a hand controller, or something standing in front of one. */
export type KeyboardHands = ControllerHands & Pick<HandController, "plugInto" | "unplug" | "letGo">;

/** What the keyboard plays: the hand controller, and the angle of the 3D view. */
export interface KeyboardParts {
  readonly hands: KeyboardHands;
  readonly view: ViewAngle;
}

/** The keyboard as a hand controller: attached for a game, detached after it. */
export class KeyboardControls {
  private readonly controller: KeyboardHands;

  constructor(
    private readonly target: KeyTarget,
    private readonly parts: KeyboardParts,
  ) {
    this.controller = parts.hands;
  }

  attach(session: GameSession): void {
    this.controller.plugInto(session);
    this.target.addEventListener("keydown", this.onKeyDown);
    this.target.addEventListener("keyup", this.onKeyUp);
    this.target.addEventListener("blur", this.onBlur);
  }

  detach(): void {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("blur", this.onBlur);
    this.controller.unplug();
  }

  /** Camera keys turn the view (holding one repeats); every other key plays the controller. */
  private readonly onKeyDown = (event: Event): void => {
    const keyboard = event as KeyboardEvent;
    const turn = viewTurnForKey(keyboard);
    if (turn !== "none" && !isTyping(keyboard)) {
      keyboard.preventDefault();
      return turn.applyTo(this.parts.view);
    }
    const command = commandForKey(keyboard);
    if (command.kind === "none" || isTyping(keyboard)) return;
    keyboard.preventDefault();
    if (!keyboard.repeat) command.press(this.controller);
  };

  private readonly onKeyUp = (event: Event): void => {
    commandForKey(event as KeyboardEvent).release(this.controller);
  };

  private readonly onBlur = (): void => {
    this.controller.letGo();
  };
}

/** Keys typed into a text field are the field's, not the game's. */
export function isTyping(event: KeyboardEvent): boolean {
  const element = event.target as HTMLElement | undefined;
  return element?.tagName === "INPUT" || element?.tagName === "TEXTAREA";
}
