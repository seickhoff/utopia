import { HARBOURS } from "../board/island-map.js";
import { isBoat, type BoatKind, type BuildingKind, type ItemKind } from "../board/item-kind.js";
import { opponentOf, type Side } from "../board/side.js";
import { isOccupied, isOpenWater } from "../board/square-content.js";
import { squareUnder } from "../geometry/pixel-point.js";
import type { Square } from "../geometry/square.js";
import type { RazzReason } from "../pilots/keypad.js";
import { rebelLandingSites } from "../rebels/rebel-sites.js";
import { cellOf } from "./cell.js";
import type { World } from "./world.js";

/** Where a bought item goes, and why it might have nowhere to go. */
export interface Placement {
  refusal(side: Side, world: World): RazzReason | "none";
  place(side: Side, world: World): void;
}

export function placementOf(item: ItemKind): Placement {
  if (item === "rebel") return ON_OPPONENTS_ISLAND;
  if (isBoat(item)) return inHarbour(item);
  return onOwnLand(item);
}

/** Buildings and crops go on the governor's own empty land under the cursor. */
function onOwnLand(building: BuildingKind): Placement {
  const target = (side: Side, world: World) => squareUnder(world.pilots[side].point());
  return {
    refusal: (side, world) => {
      const content = world.board.contentAt(target(side, world));
      if (content.terrain !== "land" || content.holder !== side) return "notYourLand";
      return isOccupied(content) ? "occupied" : "none";
    },
    place: (side, world) => {
      world.board.build(target(side, world), building);
      announce(world, { side, item: building, square: target(side, world) });
    },
  };
}

/** Boats are launched in the governor's harbour, which must be clear. */
function inHarbour(boat: BoatKind): Placement {
  return {
    refusal: (side, world) =>
      isOpenWater(world.board.contentAt(HARBOURS[side])) ? "none" : "harbourBusy",
    place: (side, world) => {
      world.board.anchor(HARBOURS[side], { side, boat });
      announce(world, { side, item: boat, square: HARBOURS[side] });
    },
  };
}

/**
 * Rebels land on the other island, wherever a band may spring up. The cartridge took the gold
 * even when none could; here the purchase is refused instead.
 */
const ON_OPPONENTS_ISLAND: Placement = {
  refusal: (side, world) =>
    rebelLandingSites(world.board, opponentOf(side)).length > 0 ? "none" : "noRebelSite",
  place: (side, world) => {
    const target = opponentOf(side);
    const sites = rebelLandingSites(world.board, target);
    const square = sites[world.dice.fortune.roll(sites.length)];
    const destroyed = world.board.contentAt(square).occupant;
    world.board.build(square, "rebel");
    announce(world, { side, item: "rebel", square });
    world.events.record({
      type: "rebelsLanded",
      side: target,
      cell: cellOf(square),
      destroyed,
      cause: "bought",
    });
  },
};

interface Purchase {
  readonly side: Side;
  readonly item: ItemKind;
  readonly square: Square;
}

function announce(world: World, purchase: Purchase): void {
  const { side, item, square } = purchase;
  world.events.record({ type: "itemBought", side, item, cell: cellOf(square) });
}
