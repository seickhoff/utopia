import type { GameOptions, Side } from "@utopia/engine";
import {
  governorName,
  type CarryOn,
  type ClientMessage,
  type Refusal,
  type ServerMessage,
  type ServerMessageType,
} from "@utopia/protocol";
import { OFFLINE, type OnlineViewModel } from "../hud/game-view.js";
import type { GameSession } from "../session/game-session.js";
import { RemoteGameSession } from "../session/remote-game-session.js";
import type { KeyValueStore } from "../settings/key-value-store.js";
import type { Match } from "./game-hud.js";
import type { GameStore } from "./game-store.js";

export type LinkState = "open" | "lost";

/** What the connection to the server reports. */
export interface LinkListener {
  message(message: ServerMessage): void;
  state(state: LinkState): void;
}

/** Port: the connection to the game server, which reconnects by itself when it drops. */
export interface ServerLink {
  open(): void;
  send(message: ClientMessage): void;
  close(): void;
}

/** Port: what online play needs from the game runner. */
export interface PlayStage {
  play(session: GameSession, match: Match): void;
  rename(names: Readonly<Record<Side, string>>): void;
  showTitle(): void;
}

export interface OnlineSetup {
  readonly store: GameStore;
  readonly stage: PlayStage;
  readonly link: (listener: LinkListener) => ServerLink;
  /** Where the seat is remembered, so a reloaded page can take it back. */
  readonly seats: KeyValueStore;
  readonly shareUrl: (room: string) => string;
  /** Milliseconds, on the frame loop's clock. */
  readonly clock: () => number;
}

interface SeatRecord {
  readonly room: string;
  readonly side: Side;
  readonly seat: string;
}

const SEAT_KEY = "utopia.seat";
const NO_NAMES: Readonly<Record<Side, string>> = { left: "", right: "" };
const REFUSALS: Readonly<Record<Refusal, string>> = {
  noSuchRoom: "No game has that code.",
  roomFull: "That game already has two governors.",
  seatGone: "That game is over.",
};

/** Special Case: no connection, when there is no online game. */
const NO_LINK: ServerLink = { open: () => {}, send: () => {}, close: () => {} };

type Handlers = {
  readonly [T in ServerMessageType]: (message: Extract<ServerMessage, { type: T }>) => void;
};

/**
 * Hosting, joining and playing a game on the server: the messages that come back move it along,
 * from a code to share, to the game itself, to a pause, a rival gone, or the lobby again.
 */
export class OnlinePlay {
  private link = NO_LINK;
  /** What to ask once connected, until the server gives a seat. */
  private opening: ClientMessage = { type: "leave" };
  private seat: SeatRecord | "unseated" = "unseated";
  private names = NO_NAMES;
  private session: RemoteGameSession | "unstarted" = "unstarted";

  constructor(private readonly setup: OnlineSetup) {}

  host(request: { readonly name: string; readonly options: GameOptions }): void {
    this.connect({ type: "host", name: governorName(request.name), options: request.options });
  }

  join(request: { readonly name: string; readonly room: string }): void {
    const room = request.room.trim().toUpperCase();
    this.connect({ type: "join", room, name: governorName(request.name) });
  }

  /** Takes back the seat this page had before it was reloaded, if it had one. */
  resume(): void {
    const record = this.remembered();
    if (record === "none") return;
    this.connect({ type: "rejoin", room: record.room, seat: record.seat });
    this.seat = record;
  }

  carryOn(choice: CarryOn): void {
    this.link.send({ type: "carryOn", choice });
  }

  /** Leaves the game, online or not, for the title screen. */
  leave(): void {
    this.link.send({ type: "leave" });
    this.hangUp();
    this.forget();
    this.setup.stage.showTitle();
  }

  private connect(first: ClientMessage): void {
    this.hangUp();
    this.opening = first;
    this.link = this.setup.link({
      message: (message) => (this.handlers[message.type] as (m: ServerMessage) => void)(message),
      state: (state) => this.linkChanged(state),
    });
    this.show({ stage: "connecting" });
    this.link.open();
  }

  /** Once connected, asks for a seat; once a dropped connection is back, takes the seat again. */
  private linkChanged(state: LinkState): void {
    if (state === "lost") return this.show({ stage: "reconnecting" });
    const { seat } = this;
    this.link.send(
      seat === "unseated" ? this.opening : { type: "rejoin", room: seat.room, seat: seat.seat },
    );
  }

  private readonly handlers: Handlers = {
    seated: (message) => this.sitAt(message),
    waiting: (message) =>
      this.show({ stage: "waiting", room: message.room, link: this.setup.shareUrl(message.room) }),
    started: (message) => this.rename(message.names),
    frame: (message) => this.receiveFrame(message),
    paused: (message) => this.show({ stage: "paused", note: this.names[message.absent] }),
    resumed: () => this.show({ stage: "playing" }),
    rivalLeft: (message) => this.show({ stage: "rivalLeft", note: this.names[message.side] }),
    closed: () => this.close({ stage: "offline", note: "The game was closed." }),
    refused: (message) => this.close({ stage: "refused", note: REFUSALS[message.reason] }),
  };

  private sitAt(message: Extract<ServerMessage, { type: "seated" }>): void {
    this.seat = { room: message.room, side: message.side, seat: message.seat };
    this.setup.seats.write(SEAT_KEY, JSON.stringify(this.seat));
  }

  private rename(names: Readonly<Record<Side, string>>): void {
    this.names = names;
    if (this.session !== "unstarted") this.setup.stage.rename(names);
  }

  /** The first frame starts the game on this page; later ones keep it up to date. */
  private receiveFrame(message: Extract<ServerMessage, { type: "frame" }>): void {
    if (this.session !== "unstarted") return this.session.receiveFrame(message);
    if (this.seat === "unseated") return;
    const { side } = this.seat;
    const { link } = this;
    const send = (sent: ClientMessage) => link.send(sent);
    this.session = new RemoteGameSession({
      side,
      first: message.snapshot,
      send,
      clock: this.setup.clock,
    });
    this.setup.stage.play(this.session, { mine: side, names: this.names, rivalled: true });
    this.show({ stage: "playing" });
  }

  /** The server is done with this page: the seat is forgotten, and the title shown again. */
  private close(view: Partial<OnlineViewModel>): void {
    const wasPlaying = this.session !== "unstarted";
    this.hangUp();
    this.forget();
    if (wasPlaying) this.setup.stage.showTitle();
    this.show(view);
  }

  private hangUp(): void {
    this.link.close();
    this.link = NO_LINK;
    this.seat = "unseated";
    this.session = "unstarted";
    this.names = NO_NAMES;
    this.show({});
  }

  private forget(): void {
    this.setup.seats.write(SEAT_KEY, "");
  }

  private remembered(): SeatRecord | "none" {
    try {
      const record: unknown = JSON.parse(this.setup.seats.read(SEAT_KEY));
      const { room, side, seat } = record as SeatRecord;
      return typeof room === "string" &&
        typeof seat === "string" &&
        (side === "left" || side === "right")
        ? { room, side, seat }
        : "none";
    } catch {
      return "none";
    }
  }

  private show(view: Partial<OnlineViewModel>): void {
    this.setup.store.update({ online: { ...OFFLINE, ...view } });
  }
}
