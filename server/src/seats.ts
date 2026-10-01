import type { GameEvent, GameSnapshot } from "@utopia/engine";
import { COMPUTER_NAME, NO_BOARD_SENT, toWire, type ServerMessage } from "@utopia/protocol";

/** Port: how the server reaches one player's browser. */
export interface PlayerLink {
  send(message: ServerMessage): void;
}

/** Special Case: the link of a player who is not connected just now. */
const AWAY: PlayerLink = { send: () => {} };

export interface Frame {
  readonly snapshot: GameSnapshot;
  readonly events: readonly GameEvent[];
}

export interface Turn {
  readonly snapshot: GameSnapshot;
  readonly seconds: number;
}

/** Who governs an island: a person at a browser, the computer, or no one. */
export type Governing = "person" | "computer" | "vacant";

/** One island's governor, as its room sees them. */
export interface Seat {
  readonly name: string;
  readonly governing: Governing;
  /** Someone governs the island just now: a connected person, or the computer. */
  readonly present: boolean;
  /** No one will: its governor has left for good. */
  readonly vacant: boolean;
  holds(token: string): boolean;
  attach(link: PlayerLink): void;
  detach(): void;
  send(message: ServerMessage): void;
  sendFrame(frame: Frame): void;
  govern(turn: Turn): void;
}

export interface Person {
  readonly name: string;
  /** The secret that lets them back into their seat after a dropped connection. */
  readonly token: string;
  readonly link: PlayerLink;
}

/** A person at a browser. Each is sent the board only when theirs is out of date. */
export class PersonSeat implements Seat {
  readonly governing = "person";
  readonly vacant = false;
  private link: PlayerLink;
  private sentRevision = NO_BOARD_SENT;

  constructor(private readonly person: Person) {
    this.link = person.link;
  }

  get name(): string {
    return this.person.name;
  }

  get present(): boolean {
    return this.link !== AWAY;
  }

  holds(token: string): boolean {
    return token === this.person.token;
  }

  attach(link: PlayerLink): void {
    this.link = link;
    this.sentRevision = NO_BOARD_SENT;
  }

  detach(): void {
    this.link = AWAY;
  }

  send(message: ServerMessage): void {
    this.link.send(message);
  }

  sendFrame(frame: Frame): void {
    const snapshot = toWire(frame.snapshot, this.sentRevision);
    this.link.send({ type: "frame", snapshot, events: frame.events });
    this.sentRevision = frame.snapshot.board.revision;
  }

  govern(): void {}
}

/** The computer, governing an island its person left. */
export class ComputerSeat implements Seat {
  readonly governing = "computer";
  readonly name = COMPUTER_NAME;
  readonly present = true;
  readonly vacant = false;

  constructor(private readonly takeTurn: (turn: Turn) => void) {}

  holds(): boolean {
    return false;
  }

  attach(): void {}
  detach(): void {}
  send(): void {}
  sendFrame(): void {}

  govern(turn: Turn): void {
    this.takeTurn(turn);
  }
}

/** Special Case: an island no one governs, before a guest joins or after its governor leaves. */
export const VACANT: Seat = {
  name: "",
  governing: "vacant",
  present: false,
  vacant: true,
  holds: () => false,
  attach: () => {},
  detach: () => {},
  send: () => {},
  sendFrame: () => {},
  govern: () => {},
};
