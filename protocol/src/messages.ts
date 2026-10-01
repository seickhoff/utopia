import type {
  BoardSnapshot,
  DiscReading,
  GameEvent,
  GameOptions,
  GameSnapshot,
  KeypadKey,
  Side,
} from "@utopia/engine";

/** What the governor left behind chooses when their rival leaves for good. */
export type CarryOn = "computer" | "lobby";

/** Everything a player's browser may say to the server. */
export type ClientMessage =
  | { readonly type: "host"; readonly name: string; readonly options: GameOptions }
  | { readonly type: "join"; readonly room: string; readonly name: string }
  | { readonly type: "rejoin"; readonly room: string; readonly seat: string }
  | { readonly type: "disc"; readonly reading: DiscReading }
  | { readonly type: "key"; readonly key: KeypadKey }
  | { readonly type: "lay"; readonly x: number; readonly y: number }
  | { readonly type: "carryOn"; readonly choice: CarryOn }
  | { readonly type: "leave" };

/** A snapshot as sent: its board left out when the player already has that one. */
export type WireSnapshot = Omit<GameSnapshot, "board"> & {
  readonly board: BoardSnapshot | "unchanged";
};

export type Refusal = "noSuchRoom" | "roomFull" | "seatGone";

/** Everything the server may say to a player. */
export type ServerMessage =
  | { readonly type: "seated"; readonly room: string; readonly side: Side; readonly seat: string }
  | { readonly type: "waiting"; readonly room: string; readonly host: string }
  | { readonly type: "started"; readonly names: Readonly<Record<Side, string>> }
  | {
      readonly type: "frame";
      readonly snapshot: WireSnapshot;
      readonly events: readonly GameEvent[];
    }
  | { readonly type: "paused"; readonly absent: Side }
  | { readonly type: "resumed" }
  | { readonly type: "rivalLeft"; readonly side: Side }
  | { readonly type: "closed" }
  | { readonly type: "refused"; readonly reason: Refusal };

export type ClientMessageType = ClientMessage["type"];
export type ServerMessageType = ServerMessage["type"];
