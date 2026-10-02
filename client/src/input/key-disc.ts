import { DISC_RELEASED, steadyDiscFacing, type DiscReading } from "@utopia/engine";
import type { Arrow } from "./key-map.js";

/** Held arrows, and which way the screen's up looks across the board: degrees clockwise from north. */
export interface HeldArrows {
  readonly held: ReadonlySet<Arrow>;
  readonly bearing: number;
}

/**
 * The disc direction held arrow keys point, as the player sees the screen: up steers the way the
 * view looks, however it is turned, to whichever of the disc's sixteen ways lies nearest; released
 * when none is held, or opposites.
 */
export function discFromArrows(arrows: HeldArrows): DiscReading {
  const { held } = arrows;
  const x = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
  const y = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
  if (x === 0 && y === 0) return DISC_RELEASED;
  const turn = (arrows.bearing * Math.PI) / 180;
  const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
  const way = { x: x * cos - y * sin, y: x * sin + y * cos };
  return steadyDiscFacing({ way, held: DISC_RELEASED });
}
