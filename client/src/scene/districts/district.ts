import type { Triangles } from "../shapes.js";

/**
 * A square of island developed as a complex, a square mile of it: a hospital's campus, a street
 * of houses, a factory yard. Its parts stand on the middle of the square's floor, -0.5 to 0.5 each
 * way, and are fitted to the land one by one.
 */
export interface District {
  /** Flat things laid on the ground: car parks, courts, helipads, lanes. */
  readonly decals: readonly Triangles[];
  /**
   * Things that stand up, each fitted to the ground beneath it on its own. The first is the
   * landmark, which stays even where the square is mostly sea; the rest keep to dry land.
   */
  readonly structures: readonly Triangles[];
}
