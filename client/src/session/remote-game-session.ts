import type {
  DiscReading,
  GameEvent,
  GameSnapshot,
  KeypadKey,
  PixelPoint,
  Side,
} from "@utopia/engine";
import { fromWire, type ClientMessage, type WireSnapshot } from "@utopia/protocol";
import { blendSnapshots } from "./blend.js";
import type { GameFrame, GameSession } from "./game-session.js";

/** The server sends a frame every twentieth of a second. */
const FRAME_MS = 50;
/** How long the player's own laid cursor is shown ahead of the server's word on it. */
const CURSOR_LEAD_MS = 400;

export interface RemoteSetup {
  readonly side: Side;
  readonly first: WireSnapshot;
  readonly send: (message: ClientMessage) => void;
  /** Milliseconds, on the same clock the frame loop passes to advanceTo. */
  readonly clock: () => number;
}

export interface ServerFrame {
  readonly snapshot: WireSnapshot;
  readonly events: readonly GameEvent[];
}

/** Where the player laid their cursor, shown until the server's frames have caught up. */
interface LaidCursor {
  readonly x: number;
  readonly y: number;
  readonly until: number;
}

/** Special Case: no cursor laid ahead of the server. */
const NOT_LAID: LaidCursor = { x: 0, y: 0, until: -Infinity };

/**
 * A game the server runs, for one of its two governors: the controls go to the server, and its
 * frames come back, shown smoothly between them. The server alone decides when play pauses.
 */
export class RemoteGameSession implements GameSession {
  readonly pausable = false;
  private previous: GameSnapshot;
  private latest: GameSnapshot;
  private arrivedAt: number;
  private shown: GameSnapshot;
  private pending: GameEvent[] = [];
  private handedOver: readonly GameEvent[] = [];
  private lastDisc: DiscReading | "unsent" = "unsent";
  private laid = NOT_LAID;

  constructor(private readonly setup: RemoteSetup) {
    const first = fromWire(setup.first, { revision: -1, squares: [] });
    this.previous = first;
    this.latest = first;
    this.shown = first;
    this.arrivedAt = setup.clock();
  }

  get side(): Side {
    return this.setup.side;
  }

  receiveFrame(frame: ServerFrame): void {
    this.previous = this.shown;
    this.latest = fromWire(frame.snapshot, this.latest.board);
    this.arrivedAt = this.setup.clock();
    this.pending.push(...frame.events);
  }

  setDisc(reading: DiscReading): void {
    if (reading === this.lastDisc) return;
    this.lastDisc = reading;
    this.setup.send({ type: "disc", reading });
  }

  pressKey(key: KeypadKey): void {
    this.setup.send({ type: "key", key });
  }

  layCursor(point: PixelPoint): void {
    this.laid = { x: point.x, y: point.y, until: this.setup.clock() + CURSOR_LEAD_MS };
    this.setup.send({ type: "lay", x: point.x, y: point.y });
  }

  advanceTo(timeMs: number): void {
    const share = Math.min(1, Math.max(0, (timeMs - this.arrivedAt) / FRAME_MS));
    this.shown = blendSnapshots({ from: this.previous, to: this.latest, share });
    this.handedOver = this.pending;
    this.pending = [];
    if (this.serverHasCursorWhereLaid()) this.laid = NOT_LAID;
  }

  frame(): GameFrame {
    const current = this.withLaidCursor(this.shown);
    return { previous: this.previous, current, alpha: 1, events: this.handedOver };
  }

  private serverHasCursorWhereLaid(): boolean {
    const { pilot } = this.latest.islands[this.side];
    return pilot.x === this.laid.x && pilot.y === this.laid.y;
  }

  /** The player's own cursor, where they laid it, until the server agrees or a moment passes. */
  private withLaidCursor(snapshot: GameSnapshot): GameSnapshot {
    const island = snapshot.islands[this.side];
    const { pilot } = island;
    if (this.setup.clock() > this.laid.until || pilot.mode !== "cursor") return snapshot;
    const moved = { ...island, pilot: { ...pilot, x: this.laid.x, y: this.laid.y } };
    return { ...snapshot, islands: { ...snapshot.islands, [this.side]: moved } };
  }
}
