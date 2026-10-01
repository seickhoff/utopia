import { BOAT_KEY, Square, itemOnKey, squareAnchor, type KeypadKey } from "@utopia/engine";
import type { BuildMenu } from "../app/build-menu.js";
import type { SideButton } from "../board/controller.js";
import type { GameSession } from "../session/game-session.js";
import { buysAtOnce } from "./click-action.js";
import type { HandController } from "./hand-controller.js";
import type { Arrow, ControllerHands } from "./key-map.js";

/**
 * The keys while the quick-build menu is open, and the menu's own buttons: an item's key buys it
 * at once on the offered square, Clear (or Enter, 0) just closes the menu, and an arrow
 * closes it as the cursor moves off. While the menu is closed, every key goes on to the hand
 * controller untouched.
 */
export class BuildMenuControls implements ControllerHands {
  constructor(
    private readonly controller: HandController,
    private readonly menu: BuildMenu,
  ) {}

  /** Buys an item from the menu: on the offered square, or wherever it goes if not there. */
  buy(key: number): void {
    const offer = this.menu.offered();
    if (offer === "closed") return;
    if (!buysAtOnce(itemOnKey(key))) {
      this.controller.layCursor(squareAnchor(Square.at(offer.square.row, offer.square.col)));
    }
    this.controller.quickBuy(key);
    this.menu.dismiss();
  }

  pressKeypad(key: KeypadKey): void {
    if (!this.menu.isOpen()) return this.controller.pressKeypad(key);
    if (typeof key === "number" && key !== BOAT_KEY) return this.buy(key);
    this.menu.dismiss();
  }

  quickBuy(key: number): void {
    if (this.menu.isOpen()) return this.buy(key);
    this.controller.quickBuy(key);
  }

  holdArrow(arrow: Arrow): void {
    this.menu.dismiss();
    this.controller.holdArrow(arrow);
  }

  releaseArrow(arrow: Arrow): void {
    this.controller.releaseArrow(arrow);
  }

  holdSideButton(button: SideButton): void {
    this.controller.holdSideButton(button);
  }

  releaseSideButton(button: SideButton): void {
    this.controller.releaseSideButton(button);
  }

  plugInto(session: GameSession): void {
    this.menu.dismiss();
    this.controller.plugInto(session);
  }

  unplug(): void {
    this.menu.dismiss();
    this.controller.unplug();
  }

  letGo(): void {
    this.controller.letGo();
  }
}
