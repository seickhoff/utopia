import type { BuildMenu } from "../app/build-menu.js";
import type { ViewAngle } from "../app/view-angle.js";
import type { GameFrame, GameSession } from "../session/game-session.js";
import type { BuildMenuControls } from "./build-menu-controls.js";
import type { HandController } from "./hand-controller.js";
import { KeyboardControls } from "./keyboard-controls.js";
import { PointerControls, type BoardPicker } from "./pointer-controls.js";
import { Steerer } from "./steerer.js";

export interface PlayerControlsSetup {
  readonly keyboard: KeyboardControls;
  readonly pointer: PointerControls;
  readonly steerer: Steerer;
}

/** Everything the player plays with, attached to a game together and fed its frames. */
export class PlayerControls {
  constructor(private readonly setup: PlayerControlsSetup) {}

  attach(session: GameSession): void {
    this.setup.keyboard.attach(session);
    this.setup.steerer.steerFor(session.side);
    this.setup.pointer.attach();
  }

  detach(): void {
    this.setup.pointer.detach();
    this.setup.keyboard.detach();
  }

  onFrame(frame: GameFrame): void {
    this.setup.steerer.onFrame(frame);
  }
}

export interface ControlParts {
  readonly controller: HandController;
  readonly menu: BuildMenu;
  readonly menuKeys: BuildMenuControls;
  readonly angle: ViewAngle;
  readonly view: BoardPicker;
  /** Where the pointer plays: the board's stage. */
  readonly surface: HTMLElement;
  /** Where the keys are heard: the window. */
  readonly keys: Window;
}

/** The keyboard and the mouse, both playing the one hand controller, through the build menu. */
export function playerControls(parts: ControlParts): PlayerControls {
  const { controller, view, surface, angle } = parts;
  const steerer = new Steerer(controller, parts.menu);
  const pointer = new PointerControls({ surface, picker: view, steerer, controller, view: angle });
  const keyboard = new KeyboardControls(parts.keys, { hands: parts.menuKeys, view: angle });
  return new PlayerControls({ keyboard, pointer, steerer });
}
