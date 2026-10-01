import {
  BOAT_KEY,
  DEFAULT_RULES,
  HARBOURS,
  keyOf,
  newGame,
  squareAnchor,
  type BoatKind,
  type BuildingKind,
  type DrifterKind,
  type Game,
  type GamePhase,
  type GameRules,
  type GameSnapshot,
  type IslandSnapshot,
  type PilotSnapshot,
  type Side,
  type SpriteSnapshot,
  type Square,
} from "@utopia/engine";
import { IslandView } from "../../src/island-view.js";

const NO_EVENTS = { record: () => {} };
const SEED = 1;

type Move = (game: Game) => void;
type Touch = (snapshot: GameSnapshot) => GameSnapshot;

export function aPosition(): PositionBuilder {
  return new PositionBuilder();
}

/** A sprite of the sea at a point, for placing fish, pirates and weather where a test wants them. */
export function aSprite(kind: DrifterKind, at: { x: number; y: number }): SpriteSnapshot {
  return {
    id: at.x * 1000 + at.y,
    slot: 0,
    kind,
    look: kind,
    frame: 0,
    mirrored: false,
    vx: 0,
    vy: 0,
    ...at,
  };
}

/**
 * A game position built the way players build one, through the keypad, then photographed. What
 * no key press can arrange (a school of fish just here, a later round) is drawn onto the snapshot.
 */
class PositionBuilder {
  private rules: GameRules = DEFAULT_RULES;
  private readonly moves: Move[] = [];
  private readonly touches: Touch[] = [];

  withGold(gold: number): this {
    this.rules = { ...this.rules, startingGold: gold };
    return this;
  }

  withBuilding(side: Side, item: BuildingKind, at: Square): this {
    return this.withCursorAt(side, at).keyed(side, [keyOf(item), "enter"]);
  }

  withBoat(side: Side, boat: BoatKind): this {
    return this.keyed(side, [keyOf(boat), "enter"]);
  }

  /** Buys a boat and sails it out of the harbour. */
  sailing(side: Side, boat: BoatKind = "fishingBoat"): this {
    return this.withBoat(side, boat).withCursorAt(side, HARBOURS[side]).keyed(side, [BOAT_KEY]);
  }

  /** The governor on this side buys a rebel band, which lands on the other island. */
  withRebelsLandedBy(side: Side): this {
    return this.keyed(side, [keyOf("rebel"), "enter"]);
  }

  inPhase(phase: GamePhase): this {
    this.touches.push((snapshot) => ({ ...snapshot, phase }));
    return this;
  }

  withCursorAt(side: Side, at: Square): this {
    this.moves.push((game) => game.layCursor(side, squareAnchor(at)));
    return this;
  }

  withSelection(side: Side, item: BuildingKind): this {
    return this.keyed(side, [keyOf(item)]);
  }

  withSprites(...sprites: SpriteSnapshot[]): this {
    this.touches.push((snapshot) => ({ ...snapshot, sprites }));
    return this;
  }

  inRound(round: number, of: { rounds: number }): this {
    const roundsLeft = of.rounds - round + 1;
    this.touches.push((snapshot) => ({ ...snapshot, round, rounds: of.rounds, roundsLeft }));
    return this;
  }

  withIsland(side: Side, standing: Partial<IslandSnapshot>): this {
    this.touches.push((snapshot) => withIsland(snapshot, { side, standing }));
    return this;
  }

  withPilot(side: Side, pilot: Partial<PilotSnapshot>): this {
    this.touches.push((snapshot) => {
      const current = snapshot.islands[side].pilot;
      return withIsland(snapshot, { side, standing: { pilot: { ...current, ...pilot } } });
    });
    return this;
  }

  snapshot(): GameSnapshot {
    return this.touches.reduce((snapshot, touch) => touch(snapshot), this.game().snapshot());
  }

  view(side: Side): IslandView {
    return new IslandView({ snapshot: this.snapshot(), side, speeds: this.rules.pilots });
  }

  /** The game itself, live, for tests that play on from the position (nothing drawn on). */
  game(): Game {
    const game = newGame({ options: {}, seed: SEED, events: NO_EVENTS, rules: this.rules });
    game.start();
    this.moves.forEach((move) => move(game));
    return game;
  }

  private keyed(side: Side, keys: readonly (number | "enter")[]): this {
    this.moves.push((game) => keys.forEach((key) => game.pressKey(side, key)));
    return this;
  }
}

function withIsland(
  snapshot: GameSnapshot,
  change: { side: Side; standing: Partial<IslandSnapshot> },
): GameSnapshot {
  const island = { ...snapshot.islands[change.side], ...change.standing };
  return { ...snapshot, islands: { ...snapshot.islands, [change.side]: island } };
}
