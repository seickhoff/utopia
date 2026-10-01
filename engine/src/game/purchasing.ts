import { priceOf, type ItemKind } from "../board/item-kind.js";
import type { Side } from "../board/side.js";
import { placementOf } from "./placement-factory.js";
import { razz } from "./razz.js";
import type { World } from "./world.js";

/** A purchase a governor has keyed in. */
export interface Order {
  readonly side: Side;
  readonly item: ItemKind;
}

/** Buys an item if it has somewhere to go and the treasury can pay; otherwise, a RAZZ. */
export function purchase(world: World, order: Order): void {
  const { side, item } = order;
  const placement = placementOf(item);
  const refusal = placement.refusal(side, world);
  if (refusal !== "none") return razz(world, { side, reason: refusal });
  const island = world.islands[side];
  if (!island.canAfford(priceOf(item))) return razz(world, { side, reason: "cannotAfford" });
  island.pay(priceOf(item));
  placement.place(side, world);
}
