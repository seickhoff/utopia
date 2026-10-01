import { ISLANDS } from "../board/island-map.js";
import { SIDES, type Side } from "../board/side.js";
import {
  projectRound,
  type RoundInputs,
  type RoundProjection,
} from "../economy/round-projection.js";
import type { Square } from "../geometry/square.js";
import type { RebelMovement } from "../rebels/rebel-movement.js";
import { rebelLandingSites, rebelsOn } from "../rebels/rebel-sites.js";
import { cellOf, squareOf } from "./cell.js";
import type { RebelChange, RoundReport } from "./game-event.js";
import { bySide, countsOf, type World } from "./world.js";

const NO_CHANGE: RebelChange = { kind: "none" };

/**
 * L_59CD, at the end of each turn: pay each side, grow its people and score its round, then
 * wither crops and move rebels, in that order.
 */
export function closeRound(world: World): void {
  const projections = bySide((side) =>
    projectRound(roundInputsOf(world, side), world.rules.economy),
  );
  SIDES.forEach((side) => world.islands[side].closeRound(projections[side]));
  const withered = witheringCrops(world);
  SIDES.forEach((side) => withered[side].forEach((square) => world.board.raze(square)));
  const rebels = bySide((side) =>
    rebelChangeFor(world, { side, movement: projections[side].rebels }),
  );
  SIDES.forEach((side) => applyRebelChange(world, rebels[side]));
  const reports = bySide((side) =>
    reportOf(projections[side], { withered: withered[side], rebels: rebels[side] }),
  );
  world.events.record({ type: "roundEnded", round: world.clock.round, reports });
  world.clock.recordRoundPlayed();
}

export function roundInputsOf(world: World, side: Side): RoundInputs {
  const standing = world.islands[side].standing();
  return { ...standing, counts: countsOf(world, side), lastRoundScore: standing.roundScore };
}

/** Each crop, in the cartridge's table order, withers on a roll of 0. */
function witheringCrops(world: World): Record<Side, Square[]> {
  const sides = world.rules.cropWitherSides;
  return bySide((side) =>
    ISLANDS[side]
      .map((land) => land.square)
      .filter((square) => world.board.contentAt(square).occupant === "crop")
      .filter(() => world.dice.fortune.roll(sides) === 0),
  );
}

interface Unrest {
  readonly side: Side;
  readonly movement: RebelMovement;
}

function rebelChangeFor(world: World, unrest: Unrest): RebelChange {
  if (unrest.movement === "rise") return risingRebels(world, unrest.side);
  if (unrest.movement === "disperse") return dispersingRebels(world, unrest.side);
  return NO_CHANGE;
}

function risingRebels(world: World, side: Side): RebelChange {
  const sites = rebelLandingSites(world.board, side);
  if (sites.length === 0) return NO_CHANGE;
  const square = sites[world.dice.fortune.roll(sites.length)];
  return { kind: "rose", cell: cellOf(square), destroyed: world.board.contentAt(square).occupant };
}

function dispersingRebels(world: World, side: Side): RebelChange {
  const [first] = rebelsOn(world.board, side);
  return first === undefined ? NO_CHANGE : { kind: "dispersed", cell: cellOf(first) };
}

function applyRebelChange(world: World, change: RebelChange): void {
  if (change.kind === "rose") world.board.build(squareOf(change.cell), "rebel");
  if (change.kind === "dispersed") world.board.raze(squareOf(change.cell));
}

interface Aftermath {
  readonly withered: readonly Square[];
  readonly rebels: RebelChange;
}

function reportOf(projection: RoundProjection, aftermath: Aftermath): RoundReport {
  const { income, population, goldEarned, score } = projection;
  const witheredCrops = aftermath.withered.map(cellOf);
  return { income, population, goldEarned, score, witheredCrops, rebels: aftermath.rebels };
}
