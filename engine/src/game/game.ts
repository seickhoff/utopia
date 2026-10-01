import type { Side } from "../board/side.js";
import type { DiscReading } from "../geometry/disc.js";
import type { PixelPoint } from "../geometry/pixel-point.js";
import type { KeypadKey } from "../pilots/keypad.js";
import type { Dice } from "../random/dice.js";
import { FRAMES_PER_SECOND } from "./frame-step.js";
import type { GameEventSink } from "./game-event.js";
import type { GameOptions } from "./game-options.js";
import type { GameRules } from "./game-rules.js";
import { snapshotOf, type GameSnapshot } from "./game-snapshot.js";
import { handleKey } from "./keypad-handling.js";
import { Stage } from "./stage.js";
import { createWorld, type World } from "./world.js";

export interface GameSetup {
  readonly options: GameOptions;
  readonly rules: GameRules;
}

/** What a game is given: its dice and somewhere to tell what happens. */
export interface GameDependencies {
  readonly sea: Dice;
  readonly fortune: Dice;
  readonly events: GameEventSink;
}

/** Leftover time below this is a rounding error, not part of a frame. */
const FRAME_TOLERANCE = 1e-6;

/**
 * A game of Utopia: the interactor players drive with the hand controller's disc and keypad, and
 * that views read through snapshots. Time comes in through advance().
 */
export class Game {
  private readonly world: World;
  private readonly stage: Stage;
  private pendingFrames = 0;

  constructor(setup: GameSetup, dependencies: GameDependencies) {
    const { sea, fortune, events } = dependencies;
    this.world = createWorld({ ...setup, dice: { sea, fortune }, events });
    this.stage = new Stage(this.world);
  }

  start(): void {
    this.stage.start();
  }

  setDisc(side: Side, reading: DiscReading): void {
    this.world.pilots[side].pressDisc(reading);
  }

  /** The keypad works only while a turn is in play; the year-end displays freeze it. */
  pressKey(side: Side, key: KeypadKey): void {
    if (this.stage.phase().name !== "playing") return;
    handleKey(this.world, { side, key });
  }

  /** Puts a governor's cursor where their own screen shows it (online play, tap-to-move tests). */
  layCursor(side: Side, point: PixelPoint): void {
    const pilot = this.world.pilots[side];
    if (pilot.mode().name === "cursor") pilot.lay(point);
  }

  advance(seconds: number): void {
    this.pendingFrames += seconds * FRAMES_PER_SECOND;
    while (this.pendingFrames >= 1 - FRAME_TOLERANCE) {
      this.pendingFrames -= 1;
      this.stage.frame();
    }
  }

  snapshot(): GameSnapshot {
    return snapshotOf(this.world, this.stage);
  }
}
