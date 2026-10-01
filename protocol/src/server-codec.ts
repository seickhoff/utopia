import type { ClientMessage, ServerMessage, ServerMessageType } from "./messages.js";
import {
  INVALID,
  isObject,
  isSide,
  isString,
  parsed,
  readerFor,
  type Invalid,
  type Raw,
} from "./raw.js";

/** A frame with a fresh board is the longest the server sends; nothing comes near this. */
const LONGEST_SERVER_MESSAGE = 256 * 1024;

type Check = (raw: Raw) => boolean;

/** What each of the server's messages must carry for a browser to act on it. */
const CHECKS: Readonly<Record<ServerMessageType, Check>> = {
  seated: (raw) => isString(raw.room) && isSide(raw.side) && isString(raw.seat),
  waiting: (raw) => isString(raw.room) && isString(raw.host),
  started: (raw) => isObject(raw.names) && isString(raw.names.left) && isString(raw.names.right),
  frame: (raw) => isObject(raw.snapshot) && Array.isArray(raw.events),
  paused: (raw) => isSide(raw.absent),
  resumed: () => true,
  rivalLeft: (raw) => isSide(raw.side),
  closed: () => true,
  refused: (raw) => isString(raw.reason),
};

/**
 * A message from the server, its shape checked, or INVALID. The game inside a frame is the
 * server's own engine's, so it is taken as sent.
 */
export function readServerMessage(text: string): ServerMessage | Invalid {
  const raw = parsed(text, LONGEST_SERVER_MESSAGE);
  if (raw === INVALID) return INVALID;
  const check = readerFor(CHECKS, raw.type);
  return check !== INVALID && check(raw) ? (raw as unknown as ServerMessage) : INVALID;
}

/** Any message, as it goes over the wire. */
export function encode(message: ServerMessage | ClientMessage): string {
  return JSON.stringify(message);
}
