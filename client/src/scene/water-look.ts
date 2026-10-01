/** Red, green and blue, as plain numbers. */
export interface Channels {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export interface WaterLook {
  /** Deep water where no floor shows: the sea's own colour within the reef. */
  readonly deep: string;
  /** The open ocean beyond the barrier reef, darker than the lagoon inside it. */
  readonly ocean: string;
  /** How fast the water swallows each colour of light, per unit of depth: red first, blue last. */
  readonly absorption: Channels;
  /** The sky the surface mirrors. */
  readonly sky: string;
  /** The pale haze where sea meets sky at the horizon, and the blue straight overhead. */
  readonly haze: string;
  readonly zenith: string;
  readonly surf: string;
}

export interface SandLook {
  /** The reef's crest: pale coral rubble, and the darker heads of living coral. */
  readonly rubble: string;
  readonly coral: string;
  readonly dry: string;
  /** Sand at the waterline, darkened by the wash of the waves. */
  readonly wet: string;
  /** The pale sand of the sea floor, as it would look with the water taken away. */
  readonly seabed: string;
  readonly seagrass: string;
}

/**
 * The sea as a satellite sees it round a Bahamas cay: its colour comes from depth alone, the
 * floor's pale sand fading through turquoise and teal to the navy of the open ocean.
 */
export const WATER: WaterLook = {
  deep: "#2d6985",
  ocean: "#18486a",
  absorption: { red: 3.2, green: 0.9, blue: 0.55 },
  sky: "#b8d3ee",
  haze: "#dce8ee",
  zenith: "#6fa6d8",
  surf: "#f6fbf8",
};

/** How far off (in squares) the haze begins, and where it has swallowed everything. */
export const HAZE = { near: 45, far: 700 };

export const SAND: SandLook = {
  rubble: "#e9dfc6",
  coral: "#6d5b4b",
  dry: "#eadcb8",
  wet: "#d6c6a0",
  seabed: "#efe6cf",
  seagrass: "#48553a",
};
