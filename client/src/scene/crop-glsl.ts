/**
 * The crops' colours as fields of them look from the air: ripe wheat, rapeseed in flower, young
 * and full-grown greens, sage, a teal-green crop, stubble, and ploughed earth.
 */
export const CROP_COLOURS: readonly string[] = [
  "#d9a935",
  "#bdb43c",
  "#5f9e3a",
  "#3f8848",
  "#8fae5a",
  "#5b9a87",
  "#a99b74",
  "#8a7556",
];

/**
 * Farmland painted by the terrain's shader: each square of it cut into a few fields, each field
 * of its own crop with its rows running its own way, and a strip of grass along every edge
 * between them. It needs NOISE_GLSL before it.
 */
export const CROP_GLSL = /* glsl */ `
const int CROP_KINDS = ${CROP_COLOURS.length};
uniform vec3 uCrops[CROP_KINDS];
uniform vec3 uVerge;

/** Which of its square's fields a point lies in, and how far it lies from that field's nearest edge. */
struct Plot {
  vec2 which;
  float edge;
};

/** The crop a number from 0 to 1 picks out of those planted. */
vec3 cropColour(float pick) {
  int chosen = int(floor(pick * float(CROP_KINDS)));
  vec3 colour = uCrops[0];
  for (int kind = 1; kind < CROP_KINDS; kind++) {
    if (kind == chosen) colour = uCrops[kind];
  }
  return colour;
}

/**
 * A square of farmland cut into fields: once from north to south, then each side of that once
 * from west to east, every cut a little askew and each square cut its own way.
 */
Plot plotAt(vec2 square, vec2 inside) {
  float lean = (hash12(square + 3.1) - 0.5) * 0.4;
  float eastOfCut = inside.x - (0.32 + 0.36 * hash12(square + 0.17)) - lean * (inside.y - 0.5);
  float side = step(0.0, eastOfCut);
  float tilt = (hash12(square + side * 2.9 + 1.3) - 0.5) * 0.3;
  float southOfCut = inside.y - (0.3 + 0.4 * hash12(square + side * 5.3 + 9.7)) - tilt * (inside.x - 0.5);
  float rim = min(min(inside.x, 1.0 - inside.x), min(inside.y, 1.0 - inside.y));
  float cuts = min(abs(eastOfCut) / sqrt(1.0 + lean * lean), abs(southOfCut) / sqrt(1.0 + tilt * tilt));
  return Plot(vec2(side, step(0.0, southOfCut)), min(rim, cuts));
}

/**
 * How far a point lies across a field's rows, which run east to west, north to south, aslant,
 * or round and round in from the field's edges, the way a harvester works it.
 */
float acrossRows(vec2 place, Plot plot, float lay) {
  if (lay < 0.25) return place.y;
  if (lay < 0.5) return place.x;
  if (lay < 0.75) return dot(place, vec2(0.53, 0.85));
  return plot.edge;
}

/**
 * A field of one crop in rows. The rows fade into their average colour where they lie closer
 * than the screen's pixels, so a far field never shimmers.
 */
vec3 cropField(vec2 place, Plot plot) {
  vec2 seed = floor(vec2(place.x + 10.0, place.y + 5.5)) * 1.7 + plot.which * 13.1 + 0.5;
  float rows = acrossRows(place, plot, hash12(seed + 4.7)) * (14.0 + 18.0 * hash12(seed + 2.3));
  float blur = clamp(fwidth(rows) * 1.5, 0.0, 1.0);
  float furrow = fract(rows);
  float growth = smoothstep(0.0, 0.3, furrow) * (1.0 - smoothstep(0.55, 0.9, furrow));
  float depth = 0.08 + 0.14 * hash12(seed + 6.6);
  vec3 crop = cropColour(hash12(seed)) * (0.9 + 0.2 * fbm(place * 2.3 + seed));
  return crop * (1.0 - depth + depth * mix(growth, 0.55, blur)) * (0.96 + 0.08 * valueNoise(place * 30.0));
}

/** Farmland: fields of different crops side by side, a strip of grass along every edge between them. */
vec3 farmland(vec2 place) {
  vec2 grid = vec2(place.x + 10.0, place.y + 5.5);
  vec2 square = floor(grid);
  Plot plot = plotAt(square, grid - square);
  vec3 verge = uVerge * (0.85 + 0.3 * valueNoise(place * 20.0));
  return mix(verge, cropField(place, plot), smoothstep(0.006, 0.018, plot.edge));
}
`;
