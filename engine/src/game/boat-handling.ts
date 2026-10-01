import { isBoat } from "../board/item-kind.js";
import type { Side } from "../board/side.js";
import { isOpenWater } from "../board/square-content.js";
import { squareUnder } from "../geometry/pixel-point.js";
import type { PilotModeName } from "../pilots/pilot-mode.js";
import { cellOf } from "./cell.js";
import { razz } from "./razz.js";
import type { World } from "./world.js";

/** Key 0: the cursor takes out an anchored boat, a sailed boat drops anchor (UNPARK/PARK_BOAT). */
const BOAT_KEY_RESPONSES: Readonly<Record<PilotModeName, (world: World, side: Side) => void>> = {
  cursor: takeBoat,
  sailing: dropAnchor,
  sinking: (world, side) => razz(world, { side, reason: "sinking" }),
};

export function handleBoatKey(world: World, side: Side): void {
  BOAT_KEY_RESPONSES[world.pilots[side].mode().name](world, side);
}

function takeBoat(world: World, side: Side): void {
  const pilot = world.pilots[side];
  const square = squareUnder(pilot.point());
  const { holder, occupant } = world.board.contentAt(square);
  if (holder !== side || !isBoat(occupant)) return razz(world, { side, reason: "noBoatHere" });
  world.board.weigh(square);
  pilot.takeBoat(occupant);
  world.events.record({ type: "boatTaken", side, boat: occupant, cell: cellOf(square) });
}

function dropAnchor(world: World, side: Side): void {
  const pilot = world.pilots[side];
  const boat = pilot.mode().aboard;
  const square = squareUnder(pilot.point());
  const clear = square.isSea() && isOpenWater(world.board.contentAt(square));
  if (!clear || boat === "none") return razz(world, { side, reason: "cannotAnchorHere" });
  world.board.anchor(square, { side, boat });
  pilot.anchor();
  world.events.record({ type: "boatAnchored", side, boat, cell: cellOf(square) });
}
