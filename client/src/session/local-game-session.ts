import type {
  DiscReading,
  Game,
  GameEvent,
  GameSnapshot,
  KeypadKey,
  PixelPoint,
  Side,
} from "@utopia/engine";
import type { EventBuffer } from "./event-buffer.js";
import type { GameFrame, GameSession } from "./game-session.js";

/** After a pause, resume where play stopped rather than fast-forwarding through missed time. */
const MAX_CATCH_UP_SECONDS = 0.25;

/** Whoever governs the other island in a solo game: the computer, or no one. */
export interface Opponent {
  play(turn: { readonly snapshot: GameSnapshot; readonly seconds: number }): void;
}

export interface LocalGameSetup {
  readonly game: Game;
  readonly side: Side;
  readonly events: EventBuffer;
  readonly opponent: Opponent;
}

/** Special Case: the original's one-player game, where the other island is simply ignored. */
export const NO_OPPONENT: Opponent = { play: () => {} };

/** Solo play: runs the game in the browser, with the computer governing the other island. */
export class LocalGameSession implements GameSession {
  readonly pausable = true;
  private lastAdvanceMs = Number.NaN;
  private previous: GameSnapshot;
  private current: GameSnapshot;
  private frameEvents: readonly GameEvent[] = [];

  constructor(private readonly setup: LocalGameSetup) {
    this.previous = setup.game.snapshot();
    this.current = this.previous;
  }

  get side(): Side {
    return this.setup.side;
  }

  setDisc(reading: DiscReading): void {
    this.setup.game.setDisc(this.side, reading);
  }

  pressKey(key: KeypadKey): void {
    this.setup.game.pressKey(this.side, key);
  }

  layCursor(point: PixelPoint): void {
    this.setup.game.layCursor(this.side, point);
  }

  advanceTo(timeMs: number): void {
    const seconds = this.secondsSinceLastAdvance(timeMs);
    this.lastAdvanceMs = timeMs;
    this.setup.opponent.play({ snapshot: this.current, seconds });
    this.setup.game.advance(seconds);
    this.previous = this.current;
    this.current = this.setup.game.snapshot();
    this.handOverEvents();
  }

  frame(): GameFrame {
    return { previous: this.previous, current: this.current, alpha: 1, events: this.frameEvents };
  }

  /** Everything since the last frame, key presses between frames included. */
  private handOverEvents(): void {
    this.frameEvents = [...this.setup.events.events()];
    this.setup.events.clear();
  }

  private secondsSinceLastAdvance(timeMs: number): number {
    if (Number.isNaN(this.lastAdvanceMs)) return 0;
    return Math.min(MAX_CATCH_UP_SECONDS, Math.max(0, (timeMs - this.lastAdvanceMs) / 1000));
  }
}
