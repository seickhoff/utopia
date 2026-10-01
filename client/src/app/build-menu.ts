import type { BuildOffer } from "../hud/game-view.js";

/**
 * Whether the quick-build menu is open, and for which square: opened by a click on the player's
 * own open land, closed by a purchase, a key, a click elsewhere, or when its offer lapses.
 */
export class BuildMenu {
  private shown: BuildOffer | "closed" = "closed";

  offer(offer: BuildOffer): void {
    this.shown = offer;
  }

  dismiss(): void {
    this.shown = "closed";
  }

  isOpen(): boolean {
    return this.shown !== "closed";
  }

  offered(): BuildOffer | "closed" {
    return this.shown;
  }
}
