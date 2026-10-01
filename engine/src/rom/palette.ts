/**
 * The Intellivision's 16 colours, as RGB, in the STIC's order (the values jzIntv shows). The
 * cartridge names the first eight: black, blue, red, tan, dark green, green, yellow and white.
 */
export const PALETTE: readonly string[] = [
  "#000000",
  "#002dff",
  "#ff3d10",
  "#c9cfab",
  "#386b3f",
  "#00a756",
  "#faea50",
  "#fffcff",
  "#bdacc8",
  "#24b8ff",
  "#ffb41f",
  "#546e00",
  "#ff4e57",
  "#a496ff",
  "#75cc80",
  "#b51a58",
];

/** The colours Utopia paints with. */
export const COLOURS = {
  black: 0,
  blue: 1,
  red: 2,
  tan: 3,
  darkGreen: 4,
  green: 5,
  yellow: 6,
  white: 7,
  grey: 8,
} as const;
