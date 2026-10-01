import { INVALID, encode, readServerMessage, type ClientMessage } from "@utopia/protocol";
import type { LinkListener, ServerLink } from "../app/online-play.js";

/** How long to wait before each try at reconnecting: soon at first, then less often. */
const RETRY_MS: readonly number[] = [500, 1000, 2000, 4000, 8000];

export interface LinkSetup {
  readonly url: string;
  readonly listener: LinkListener;
}

/** The part of a WebSocket the link uses, so that before the first one there is a stand-in. */
type Socket = Pick<WebSocket, "send" | "close" | "readyState">;

/** Special Case: no socket yet, or none any more. */
const NO_SOCKET: Socket = { send: () => {}, close: () => {}, readyState: WebSocket.CLOSED };

/**
 * The browser's WebSocket to the game server: every message checked as it arrives, and a lost
 * connection tried again and again until it comes back or the link is closed on purpose.
 */
export class WebSocketLink implements ServerLink {
  private socket: Socket = NO_SOCKET;
  private wanted = false;
  private tries = 0;

  constructor(private readonly setup: LinkSetup) {}

  open(): void {
    this.wanted = true;
    this.connect();
  }

  send(message: ClientMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(encode(message));
  }

  close(): void {
    this.wanted = false;
    this.socket.close();
    this.socket = NO_SOCKET;
  }

  private connect(): void {
    const socket = new WebSocket(this.setup.url);
    const { listener } = this.setup;
    socket.onopen = () => {
      this.tries = 0;
      listener.state("open");
    };
    socket.onmessage = (event) => {
      const message = readServerMessage(String(event.data));
      if (message !== INVALID) listener.message(message);
    };
    socket.onclose = () => this.reconnectIfWanted(socket);
    this.socket = socket;
  }

  private reconnectIfWanted(socket: Socket): void {
    if (!this.wanted || socket !== this.socket) return;
    this.setup.listener.state("lost");
    const wait = RETRY_MS[Math.min(this.tries, RETRY_MS.length - 1)];
    this.tries += 1;
    setTimeout(() => this.wanted && this.connect(), wait);
  }
}
