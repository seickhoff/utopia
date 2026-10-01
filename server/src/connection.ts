import {
  INVALID,
  readClientMessage,
  type ClientMessage,
  type ClientMessageType,
} from "@utopia/protocol";
import { UNSEATED, type Directory, type Seating } from "./directory.js";
import type { PlayerLink } from "./seats.js";

export interface ConnectionSetup {
  readonly directory: Directory;
  readonly link: PlayerLink;
}

type Route = (connection: Connection, message: ClientMessage) => void;
type Routes = {
  readonly [T in ClientMessageType]: (
    connection: Connection,
    message: Extract<ClientMessage, { type: T }>,
  ) => void;
};

const ROUTES: Routes = {
  host: (connection, message) =>
    connection.directory().host({ ...message, asker: connection.asker() }),
  join: (connection, message) =>
    connection.directory().join({ ...message, asker: connection.asker() }),
  rejoin: (connection, message) =>
    connection.directory().rejoin({ ...message, asker: connection.asker() }),
  disc: (connection, message) => connection.seating().input(message),
  key: (connection, message) => connection.seating().input(message),
  lay: (connection, message) => connection.seating().input(message),
  carryOn: (connection, message) => connection.seating().carryOn(message.choice),
  leave: (connection) => connection.leave(),
};

/**
 * One browser's connection: its messages, each checked, sent to the directory until it has a
 * seat, and to its room after. Whatever cannot be read is ignored.
 */
export class Connection {
  private seated: Seating = UNSEATED;

  constructor(private readonly setup: ConnectionSetup) {}

  receive(text: string): void {
    const message = readClientMessage(text);
    if (message === INVALID) return;
    (ROUTES[message.type] as Route)(this, message);
  }

  /** The connection is gone: its seat is held for it. */
  drop(): void {
    this.seated.drop();
    this.seated = UNSEATED;
  }

  leave(): void {
    this.seated.leave();
    this.seated = UNSEATED;
  }

  directory(): Directory {
    return this.setup.directory;
  }

  seating(): Seating {
    return this.seated;
  }

  asker() {
    return { link: this.setup.link, seatAt: (seating: Seating) => (this.seated = seating) };
  }
}
