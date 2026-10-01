import type { Point3 } from "./camera-framing.js";

export interface Sunlight {
  /** Where the sun stands, seen from the middle of the board. */
  readonly from: Point3;
  readonly colour: string;
  readonly strength: number;
}

export interface Skylight {
  readonly sky: string;
  /** The light thrown back up from the land and sea, onto faces turned downward. */
  readonly ground: string;
  readonly strength: number;
}

/**
 * One sun for the whole diorama, so the models' lights and the terrain's shader agree. It stands in
 * the west-south-west: the fronts of buildings catch it, and shadows fall to the side, in view.
 */
export const SUNLIGHT: Sunlight = {
  from: { x: -8, y: 10, z: 3 },
  colour: "#fff0d2",
  strength: 2.2,
};

/** The sky's own colours, from a little above the horizon's haze up to straight overhead. */
export const SKY_COLOURS = { blue: "#a9cfec", zenith: "#5e97d4" };

/** A bright tropical sky above, and a warm bounce below, so no face falls to black. */
export const SKYLIGHT: Skylight = { sky: "#d6e8ff", ground: "#6a7458", strength: 1.3 };
