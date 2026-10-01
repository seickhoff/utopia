import type { Rgb } from "./shapes.js";

/** What varies from one side's model to the other's: the flags, hulls and trim in its colour. */
export interface KitStyle {
  readonly accent: Rgb;
}
