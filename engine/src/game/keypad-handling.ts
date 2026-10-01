import type { ItemKind } from "../board/item-kind.js";
import type { Side } from "../board/side.js";
import {
  keypadStep,
  type KeypadKey,
  type KeypadResponder,
  type RazzReason,
} from "../pilots/keypad.js";
import { handleBoatKey } from "./boat-handling.js";
import { purchase } from "./purchasing.js";
import { razz } from "./razz.js";
import type { World } from "./world.js";

export interface KeyPress {
  readonly side: Side;
  readonly key: KeypadKey;
}

export function handleKey(world: World, press: KeyPress): void {
  const step = keypadStep(world.selections.of(press.side), press.key);
  world.selections.choose(press.side, step.selection);
  step.action.answer(new KeypadResponse(world, press.side));
}

/** The game's answer to one governor's key press. */
class KeypadResponse implements KeypadResponder {
  constructor(
    private readonly world: World,
    private readonly side: Side,
  ) {}

  selected(item: ItemKind): void {
    this.world.events.record({ type: "itemSelected", side: this.side, item });
  }

  cancelled(): void {
    this.world.events.record({ type: "selectionCancelled", side: this.side });
  }

  ordered(item: ItemKind): void {
    purchase(this.world, { side: this.side, item });
  }

  razzed(reason: RazzReason): void {
    razz(this.world, { side: this.side, reason });
  }

  boatKey(): void {
    handleBoatKey(this.world, this.side);
  }
}
