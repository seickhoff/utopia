import { PixelPoint, steerToward, type DiscReading } from "@utopia/engine";
import type { Arrow } from "./key-map.js";

const ORIGIN = new PixelPoint(0, 0);
const REACH = 16;

/** The disc direction held arrow keys point: one of eight, or released when none (or opposites). */
export function discFromArrows(held: ReadonlySet<Arrow>): DiscReading {
  const x = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
  const y = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
  return steerToward(ORIGIN, new PixelPoint(x * REACH, y * REACH));
}
