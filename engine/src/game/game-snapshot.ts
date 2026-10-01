import type { ItemKind } from "../board/item-kind.js";
import type { Side } from "../board/side.js";
import { backtabCard } from "../board/backtab.js";
import type { SquareContent } from "../board/square-content.js";
import { GRID_SQUARES, Square } from "../geometry/square.js";
import type { IslandStanding } from "../island/island.js";
import type { Selection } from "../pilots/keypad.js";
import type { Aboard, PilotModeName } from "../pilots/pilot-mode.js";
import type { Drifter, DrifterKind } from "../sea/drifter.js";
import type { LookName } from "../sea/sprite-looks.js";
import { cellOf, type Cell } from "./cell.js";
import type { GamePhase, Stage } from "./stage.js";
import { bySide, countsOf, type World } from "./world.js";

/** How a sprite looks and moves, in sprite (MOB) pixel coordinates and EXEC velocity units. */
export interface SpriteLookSnapshot {
  readonly look: LookName;
  readonly frame: number;
  readonly mirrored: boolean;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

/** A governor's own sprite. */
export interface PilotSnapshot extends SpriteLookSnapshot {
  readonly mode: PilotModeName;
  readonly aboard: Aboard;
}

/** Weather, a pirate or a school of fish; the id lets a view follow it from frame to frame. */
export interface SpriteSnapshot extends SpriteLookSnapshot {
  readonly id: number;
  readonly slot: number;
  readonly kind: DrifterKind;
}

export interface IslandSnapshot extends IslandStanding {
  readonly side: Side;
  readonly counts: Readonly<Record<ItemKind, number>>;
  readonly selection: Selection;
  readonly pilot: PilotSnapshot;
}

/** A square that holds something: island land, or water with a boat or wreck. */
export interface SquareSnapshot extends Cell, SquareContent {
  /** The cartridge card the square shows (BLANK_CARD for water). */
  readonly card: number;
  /** How far a wreck has gone down: 0 still shows the boat, 1-8 the sinking cards. */
  readonly wreckFrame: number;
}

export interface BoardSnapshot {
  /** Bumped by every change, so a view or the network can tell when to look again. */
  readonly revision: number;
  readonly squares: readonly SquareSnapshot[];
}

/** The whole game as plain data, for views, sound, the computer governor and the network. */
export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly phaseSecondsLeft: number;
  readonly round: number;
  readonly rounds: number;
  readonly roundsLeft: number;
  readonly secondsLeft: number;
  readonly islands: Readonly<Record<Side, IslandSnapshot>>;
  readonly board: BoardSnapshot;
  readonly sprites: readonly SpriteSnapshot[];
}

export function snapshotOf(world: World, stage: Stage): GameSnapshot {
  const { clock } = world;
  const phase = stage.phase();
  return {
    phase: phase.name,
    phaseSecondsLeft: phase.secondsLeft(),
    round: clock.round,
    rounds: clock.rounds,
    roundsLeft: clock.roundsLeft,
    secondsLeft: clock.secondsLeft,
    islands: bySide((side) => islandSnapshotOf(world, side)),
    board: { revision: world.board.revision, squares: heldSquares(world) },
    sprites: world.sea.all().map((drifter) => spriteSnapshotOf(world, drifter)),
  };
}

function spriteSnapshotOf(world: World, drifter: Drifter): SpriteSnapshot {
  const { x, y } = drifter.point();
  const { x: vx, y: vy } = drifter.velocity();
  return {
    id: drifter.id,
    slot: world.sea.slotOf(drifter),
    kind: drifter.kind,
    look: drifter.lookName(),
    frame: drifter.frame(),
    mirrored: drifter.isMirrored(),
    x,
    y,
    vx,
    vy,
  };
}

function islandSnapshotOf(world: World, side: Side): IslandSnapshot {
  const pilot = world.pilots[side];
  const { x, y } = pilot.point();
  const { x: vx, y: vy } = pilot.velocity();
  return {
    ...world.islands[side].standing(),
    side,
    counts: countsOf(world, side).asTally(),
    selection: world.selections.of(side),
    pilot: {
      mode: pilot.mode().name,
      aboard: pilot.mode().aboard,
      look: pilot.mode().look,
      frame: pilot.frame(),
      mirrored: pilot.isMirrored(),
      x,
      y,
      vx,
      vy,
    },
  };
}

function heldSquares(world: World): SquareSnapshot[] {
  const squares: SquareSnapshot[] = [];
  for (let offset = 0; offset < GRID_SQUARES; offset += 1) {
    const square = Square.fromOffset(offset);
    const content = world.board.contentAt(square);
    if (content.terrain !== "land" && content.occupant === "nothing") continue;
    const wreck = world.board.wreckAt(square);
    squares.push({
      ...cellOf(square),
      ...content,
      card: backtabCard(content, wreck),
      wreckFrame: wreck.frame,
    });
  }
  return squares;
}
