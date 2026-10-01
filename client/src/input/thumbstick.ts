import { DISC_RELEASED, steadyDiscFacing, type DiscReading, type Way } from "@utopia/engine";
import { TAP_SLOP } from "./touch-gestures.js";

/** A finger dragged from where it landed: how far across the glass, and which way on the board. */
export interface Push {
  /** How far the finger has dragged across the glass, in page pixels. */
  readonly reach: number;
  /** The way the drag runs across the board itself (x east, y south), the view's slant undone. */
  readonly way: Way;
}

/**
 * A finger on the glass as the hand controller's disc: wherever it landed, the way it has been
 * dragged from there is the way pressed, so a boat can be driven right to the edge of the sea
 * without the finger running off the screen. Back about where it landed, the disc is let go. The
 * way held is kept while the finger wavers at the edge of the next.
 */
export function thumbstick(stick: Push & { readonly held: DiscReading }): DiscReading {
  if (stick.reach <= TAP_SLOP) return DISC_RELEASED;
  return steadyDiscFacing({ way: stick.way, held: stick.held });
}
