/**
 * What the governors build, painted into the land by the terrain's shader: fields where crops are
 * planted, and under each district its lawns, paving or packed earth, with streets where districts
 * meet. Which use each square has comes from a texture of one texel a square, holding the use's
 * code (0 bare, 1 field, 2 lawn, 3 paved, 4 dirt) times 50. It needs NOISE_GLSL before it.
 */
export const LAND_USE_GLSL = /* glsl */ `
uniform sampler2D uLandUse;
uniform vec3 uSoil;
uniform vec3 uLeaf;
uniform vec3 uLawn;
uniform vec3 uPaving;
uniform vec3 uDirt;
uniform vec3 uAsphalt;
uniform vec3 uRoadLine;

struct Lot {
  float use;
  float cover;
  float street;
  float line;
};

float useOf(vec2 square) {
  return floor(texture2D(uLandUse, (square + 0.5) / vec2(20.0, 11.0)).r * 5.1 + 0.5);
}

/** Whether neighbouring land runs on together: fields with fields, districts with districts. */
float joins(float use, float other) {
  float fields = step(0.5, use) * step(use, 1.5) * step(0.5, other) * step(other, 1.5);
  float developed = step(1.5, use) * step(1.5, other);
  return max(fields, developed);
}

/** How far a point lies inside its square from each side, or far if that side joins on. */
float edgeDistance(float inside, vec2 neighbours) {
  return min(mix(inside, 9.0, neighbours.x), mix(1.0 - inside, 9.0, neighbours.y));
}

/** How far a point lies from the nearest side it shares with another district, or far. */
float streetDistance(float inside, vec2 neighbours) {
  return min(mix(9.0, inside, neighbours.x), mix(9.0, 1.0 - inside, neighbours.y));
}

/**
 * The lot a point stands in. Land in use fills its square right up to any neighbour it joins,
 * stops toward open sand at a hedge with rounded corners, and runs down to the sea, following
 * the true shore, leaving only the wet sand the waves wash over (a pixel or so wide). Where two
 * districts meet, a street runs along their border.
 */
Lot lotAt(vec2 place, float shoreDistance) {
  vec2 grid = vec2(place.x + 10.0, place.y + 5.5);
  vec2 square = floor(grid);
  float use = useOf(square);
  if (use < 0.5) return Lot(0.0, 0.0, 0.0, 0.0);
  vec2 inside = grid - square;
  vec2 across = vec2(joins(use, useOf(square - vec2(1.0, 0.0))), joins(use, useOf(square + vec2(1.0, 0.0))));
  vec2 down = vec2(joins(use, useOf(square - vec2(0.0, 1.0))), joins(use, useOf(square + vec2(0.0, 1.0))));
  vec2 edges = vec2(edgeDistance(inside.x, across), edgeDistance(inside.y, down));
  float hedge = 0.16 - length(max(vec2(0.16) - edges, 0.0));
  float cover = smoothstep(0.035, 0.075, hedge) * smoothstep(0.05, 0.45, shoreDistance);
  float border = min(streetDistance(inside.x, across), streetDistance(inside.y, down));
  float street = step(1.5, use) * (1.0 - smoothstep(0.042, 0.05, border));
  float dash = step(0.5, fract((inside.x + inside.y) * 9.0));
  float line = street * (1.0 - smoothstep(0.003, 0.006, border)) * dash;
  return Lot(use, cover, street, line);
}

/** How much of the ground is under plants: three rows a square running east to west. */
float plantRows(vec2 place) {
  float furrow = fract((place.y + 5.5) * 3.0);
  return smoothstep(0.02, 0.16, furrow) * (1.0 - smoothstep(0.76, 0.92, furrow));
}

/** Brown soil in the furrows; leafy rows, each a shade apart, as fields of different crops are. */
vec3 field(vec2 place, float plants) {
  float row = floor((place.y + 5.5) * 3.0);
  float shade = 0.88 + 0.24 * hash12(vec2(row, 7.0));
  vec3 soil = uSoil * (0.85 + 0.3 * valueNoise(place * 11.0));
  vec3 leaves = uLeaf * shade * (0.7 + 0.6 * fbm(place * 7.0));
  return mix(soil, leaves, plants);
}

/** The ground a lot is laid with, and its street where it borders another district. */
vec3 lotGround(vec2 place, Lot lot, float plants) {
  vec3 ground = lot.use < 1.5 ? field(place, plants)
    : lot.use < 2.5 ? uLawn * (0.82 + 0.3 * fbm(place * 3.0))
    : lot.use < 3.5 ? uPaving * (0.9 + 0.14 * valueNoise(place * 6.0))
    : uDirt * (0.84 + 0.26 * fbm(place * 2.5));
  vec3 street = mix(uAsphalt * (0.92 + 0.12 * valueNoise(place * 9.0)), uRoadLine, lot.line);
  return mix(ground, street, lot.street);
}
`;
