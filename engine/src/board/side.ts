/** The two islands and their governors: left (the cartridge's player 0) and right (player 1). */
export type Side = "left" | "right";
/** Whose a square or boat is; open sea is nobody's. */
export type Holder = Side | "nobody";

export const SIDES: readonly Side[] = ["left", "right"];
export const NOBODY = "nobody";

export function opponentOf(side: Side): Side {
  return side === "left" ? "right" : "left";
}
