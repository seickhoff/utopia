import type { BoardSnapshot, GameSnapshot } from "@utopia/engine";
import type { WireSnapshot } from "./messages.js";

/** Special Case: the board revision of a player who has been sent no board yet. */
export const NO_BOARD_SENT = -1;

/** A snapshot to send, its board left out if the player already has this revision of it. */
export function toWire(snapshot: GameSnapshot, sentRevision: number): WireSnapshot {
  const same = snapshot.board.revision === sentRevision;
  return { ...snapshot, board: same ? "unchanged" : snapshot.board };
}

/** A snapshot as sent, made whole with the board the player already has. */
export function fromWire(wire: WireSnapshot, lastBoard: BoardSnapshot): GameSnapshot {
  return { ...wire, board: wire.board === "unchanged" ? lastBoard : wire.board };
}
