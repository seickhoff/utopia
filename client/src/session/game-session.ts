import type {
  DiscReading,
  GameEvent,
  GameSnapshot,
  KeypadKey,
  PixelPoint,
  Side,
} from "@utopia/engine";

/** What the views draw each frame: two bracketing snapshots, how far between them, what happened. */
export interface GameFrame {
  readonly previous: GameSnapshot;
  readonly current: GameSnapshot;
  /** 0 shows previous, 1 shows current. */
  readonly alpha: number;
  /** Everything that happened since the last frame, in order. */
  readonly events: readonly GameEvent[];
}

/**
 * Port owned by the client: how input and views talk to a game, wherever it runs. The local
 * session runs it in the browser; the remote session plays back the server's.
 */
export interface GameSession {
  /** The island this player governs. */
  readonly side: Side;
  /** A solo game waits while its player is away; a shared one carries on. */
  readonly pausable: boolean;
  setDisc(reading: DiscReading): void;
  pressKey(key: KeypadKey): void;
  /** Puts the cursor straight onto a point (the mouse snapping it to a square). */
  layCursor(point: PixelPoint): void;
  /** Moves play up to this wall-clock time, in milliseconds. */
  advanceTo(timeMs: number): void;
  frame(): GameFrame;
}
