import {
  DISC_DIRECTIONS,
  sanitizeGameOptions,
  type DiscReading,
  type GameOptions,
  type KeypadKey,
} from "@utopia/engine";
import type { ClientMessage, ClientMessageType } from "./messages.js";
import { governorName } from "./names.js";
import { INVALID, isObject, isString, parsed, readerFor, type Invalid, type Raw } from "./raw.js";

/** A player's messages are short; anything longer is someone else's. */
const LONGEST_CLIENT_MESSAGE = 1024;
const ROOM_CODE = /^[A-Z]{4}$/;
const SEAT_TOKEN = /^[a-z0-9]{12,40}$/;
const LONGEST_NAME = 64;
/** Sprite coordinates run from the off-screen origin out past the right edge; nothing beyond. */
const COORDINATE_LIMIT = 256;
const WORD_KEYS: readonly unknown[] = ["clear", "enter"];
const CARRY_ONS: readonly unknown[] = ["computer", "lobby"];

type Reader = (raw: Raw) => ClientMessage | Invalid;

const isRoom = (value: unknown): value is string => isString(value) && ROOM_CODE.test(value);
const isSeat = (value: unknown): value is string => isString(value) && SEAT_TOKEN.test(value);
const isName = (value: unknown): value is string => isString(value) && value.length <= LONGEST_NAME;
const isWhole = (value: unknown, below: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < below;

const READERS: Readonly<Record<ClientMessageType, Reader>> = {
  host: (raw) =>
    isName(raw.name)
      ? { type: "host", name: governorName(raw.name), options: optionsOf(raw.options) }
      : INVALID,
  join: (raw) =>
    isRoom(raw.room) && isName(raw.name)
      ? { type: "join", room: raw.room, name: governorName(raw.name) }
      : INVALID,
  rejoin: (raw) =>
    isRoom(raw.room) && isSeat(raw.seat)
      ? { type: "rejoin", room: raw.room, seat: raw.seat }
      : INVALID,
  disc: (raw) =>
    raw.reading === "released" || isWhole(raw.reading, DISC_DIRECTIONS)
      ? { type: "disc", reading: raw.reading as DiscReading }
      : INVALID,
  key: (raw) =>
    WORD_KEYS.includes(raw.key) || isWhole(raw.key, 10)
      ? { type: "key", key: raw.key as KeypadKey }
      : INVALID,
  lay: (raw) =>
    isWhole(raw.x, COORDINATE_LIMIT) && isWhole(raw.y, COORDINATE_LIMIT)
      ? { type: "lay", x: raw.x, y: raw.y }
      : INVALID,
  carryOn: (raw) =>
    CARRY_ONS.includes(raw.choice)
      ? { type: "carryOn", choice: raw.choice as "computer" | "lobby" }
      : INVALID,
  leave: () => ({ type: "leave" }),
};

/** The game options asked for, brought within the cartridge's limits; numbers only. */
function optionsOf(value: unknown): GameOptions {
  if (!isObject(value)) return sanitizeGameOptions({});
  const number = (field: unknown) => (typeof field === "number" ? field : undefined);
  return sanitizeGameOptions({
    rounds: number(value.rounds),
    roundSeconds: number(value.roundSeconds),
  });
}

/** A player's message, every field checked, or INVALID. The server trusts nothing else. */
export function readClientMessage(text: string): ClientMessage | Invalid {
  const raw = parsed(text, LONGEST_CLIENT_MESSAGE);
  if (raw === INVALID) return INVALID;
  const reader = readerFor(READERS, raw.type);
  return reader === INVALID ? INVALID : reader(raw);
}
