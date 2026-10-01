import {
  DISC_RELEASED,
  HARBOURS,
  ISLANDS,
  PixelPoint,
  discVelocity,
  opponentOf,
  priceOf,
  squareUnder,
  steerToward,
  type BoatKind,
  type DiscReading,
  type DrifterKind,
  type GameSnapshot,
  type IslandSnapshot,
  type ItemKind,
  type PilotModeName,
  type PilotSpeeds,
  type Selection,
  type Side,
  type SpriteSnapshot,
  type Square,
} from "@utopia/engine";
import { BoardView } from "./board-view.js";

export interface ViewSetup {
  readonly snapshot: GameSnapshot;
  readonly side: Side;
  readonly speeds: PilotSpeeds;
}

/** How fast the disc drives the pilot in each of its modes. */
const SPEED_IN: Readonly<Record<PilotModeName, (speeds: PilotSpeeds) => number>> = {
  cursor: (speeds) => speeds.cursorSpeed,
  sailing: (speeds) => speeds.boatSpeed,
  sinking: () => 0,
};

/**
 * One governor's view of the game, as their screen shows it: their island and treasury, their
 * pilot, the board and the sea. It is all the computer governor ever learns of the game.
 */
export class IslandView {
  private readonly board: BoardView;
  private readonly island: IslandSnapshot;

  constructor(private readonly setup: ViewSetup) {
    this.board = new BoardView(setup.snapshot.board.squares);
    this.island = setup.snapshot.islands[setup.side];
  }

  get side(): Side {
    return this.setup.side;
  }

  opponent(): IslandView {
    return new IslandView({ ...this.setup, side: opponentOf(this.side) });
  }

  isPlaying(): boolean {
    return this.setup.snapshot.phase === "playing";
  }

  round(): number {
    return this.setup.snapshot.round;
  }

  /** The rounds still to be scored, this one included. */
  roundsLeft(): number {
    return this.setup.snapshot.roundsLeft;
  }

  gold(): number {
    return this.island.gold;
  }

  canAfford(item: ItemKind): boolean {
    return this.island.gold >= priceOf(item);
  }

  totalScore(): number {
    return this.island.totalScore;
  }

  /** Where the island stands before its round is scored: what the economy's sums start from. */
  standing(): IslandSnapshot {
    return this.island;
  }

  count(item: ItemKind): number {
    return this.island.counts[item];
  }

  selection(): Selection {
    return this.island.selection;
  }

  hasSelection(): boolean {
    return this.island.selection !== "none";
  }

  pilotMode(): PilotModeName {
    return this.island.pilot.mode;
  }

  isSailing(boat: BoatKind): boolean {
    return this.island.pilot.mode === "sailing" && this.island.pilot.aboard === boat;
  }

  pilotPoint(): PixelPoint {
    return new PixelPoint(this.island.pilot.x, this.island.pilot.y);
  }

  pilotSquare(): Square {
    return squareUnder(this.pilotPoint());
  }

  /** Whether the pilot is moving as a press of the disc would send it. */
  heeds(reading: DiscReading): boolean {
    const { vx, vy, mode } = this.island.pilot;
    const expected = discVelocity(reading, SPEED_IN[mode](this.setup.speeds));
    return expected.x === vx && expected.y === vy;
  }

  hasArrivedAt(point: PixelPoint): boolean {
    return steerToward(this.pilotPoint(), point) === DISC_RELEASED;
  }

  islandSquares(): Square[] {
    return ISLANDS[this.side].map((land) => land.square);
  }

  buildableSquares(): Square[] {
    return this.islandSquares().filter((square) => this.isBuildable(square));
  }

  isBuildable(square: Square): boolean {
    return this.board.isBuildable({ square, side: this.side });
  }

  isOwnLand(square: Square): boolean {
    return this.board.isLandOf({ square, side: this.side });
  }

  isOpenWater(square: Square): boolean {
    return this.board.isOpenWater(square);
  }

  isNavigable(square: Square): boolean {
    return this.board.isNavigable(square);
  }

  isShore(square: Square): boolean {
    return this.board.isShore(square);
  }

  /** Whether a fort of this side's stands beside a square, first in the cartridge's search. */
  isGuarded(square: Square): boolean {
    return this.board.fortNear(square) === this.side;
  }

  hasRebelLandingSite(): boolean {
    return this.islandSquares().some((square) => this.board.isRebelLandingSite(square));
  }

  harbour(): Square {
    return HARBOURS[this.side];
  }

  isHarbourFree(): boolean {
    return this.board.isOpenWater(this.harbour());
  }

  anchoredBoats(boat: BoatKind): Square[] {
    return this.board.anchoredBoats({ side: this.side, boat });
  }

  holds(holding: { readonly square: Square; readonly item: ItemKind }): boolean {
    return this.board.holds({ ...holding, side: this.side });
  }

  sprites(kind: DrifterKind): SpriteSnapshot[] {
    return this.setup.snapshot.sprites.filter((sprite) => sprite.kind === kind);
  }
}
