import { SHORE_REACH } from "./ground-fit.js";
import { LAND_USE_STEP } from "./land-use.js";

/**
 * What the governors build, painted into the land by the terrain's shader: fields where crops are
 * planted, and under each district its lawns, paving or packed earth, with streets where districts
 * meet. Which use each square has comes from a texture of one texel a square, holding the use's
 * code (0 bare, 1 field, 2 lawn, 3 paved, 4 dirt, 5 airfield, 6 suburb, 7 sea) times LAND_USE_STEP. It needs
 * NOISE_GLSL and CROP_GLSL before it.
 */
export const LAND_USE_GLSL = /* glsl */ `
uniform sampler2D uLandUse;
uniform vec3 uLawn;
uniform vec3 uPaving;
uniform vec3 uDirt;
uniform vec3 uAirfield;
uniform vec3 uCanopy;
uniform vec3 uAsphalt;
uniform vec3 uRoadLine;

const float SEA = 7.0;
const float USES_PER_BYTE = ${(255 / LAND_USE_STEP).toFixed(4)};
/** How far past the shoreline, in pixels, land in use runs: to just short of the water's edge. */
const float SHORE_REACH = ${SHORE_REACH.toFixed(2)};

struct Lot {
  float use;
  float cover;
  float street;
  float line;
};

float useOf(vec2 square) {
  return floor(texture2D(uLandUse, (square + 0.5) / vec2(20.0, 11.0)).r * USES_PER_BYTE + 0.5);
}

/** Whether two districts meet, so a street runs along the border between them. */
float meets(float use, float other) {
  return step(1.5, use) * step(1.5, other) * step(other, SEA - 0.5);
}

/**
 * Whether land in use runs on into its neighbour with no hedge between: into any land in use,
 * fields and districts alike, and down to the sea. It stops at a hedge only toward open sand.
 */
float joins(float other) {
  return step(0.5, other);
}

/** How far a point lies inside its square from each side, or far if that side joins on. */
float edgeDistance(float inside, vec2 neighbours) {
  return min(mix(inside, 9.0, neighbours.x), mix(1.0 - inside, 9.0, neighbours.y));
}

/** How far a point lies from the nearest side it shares with another district, or far. */
float streetDistance(float inside, vec2 neighbours) {
  return min(mix(9.0, inside, neighbours.x), mix(9.0, 1.0 - inside, neighbours.y));
}

/** How far into its lot a point lies: 0 at a hedge toward open sand, rounded at the corners. */
float hedgeDistance(vec4 around, vec2 inside) {
  vec2 across = vec2(joins(around.x), joins(around.y));
  vec2 down = vec2(joins(around.z), joins(around.w));
  vec2 edges = vec2(edgeDistance(inside.x, across), edgeDistance(inside.y, down));
  return 0.16 - length(max(vec2(0.16) - edges, 0.0));
}

/** How far a point lies from the nearest border its square shares with another district. */
float borderDistance(float use, vec4 around, vec2 inside) {
  vec2 across = vec2(meets(use, around.x), meets(use, around.y));
  vec2 down = vec2(meets(use, around.z), meets(use, around.w));
  return min(streetDistance(inside.x, across), streetDistance(inside.y, down));
}

/**
 * The lot a point stands in. Land in use fills its square right up to any neighbour in use,
 * stops toward open sand at a hedge with rounded corners, and runs down to the sea right to the
 * water's edge, following the true shore. Where two districts meet, a street runs along their
 * border.
 */
Lot lotAt(vec2 place, float shoreDistance) {
  vec2 grid = vec2(place.x + 10.0, place.y + 5.5);
  vec2 square = floor(grid);
  float use = useOf(square);
  if (use < 0.5 || use > SEA - 0.5) return Lot(0.0, 0.0, 0.0, 0.0);
  vec2 inside = grid - square;
  vec4 around = vec4(
    useOf(square - vec2(1.0, 0.0)), useOf(square + vec2(1.0, 0.0)),
    useOf(square - vec2(0.0, 1.0)), useOf(square + vec2(0.0, 1.0)));
  float shore = smoothstep(SHORE_REACH - 0.25, SHORE_REACH, shoreDistance);
  float cover = smoothstep(0.035, 0.075, hedgeDistance(around, inside)) * shore;
  float border = borderDistance(use, around, inside);
  float street = step(1.5, use) * (1.0 - smoothstep(0.042, 0.05, border));
  float dash = step(0.5, fract((inside.x + inside.y) * 9.0));
  float line = street * (1.0 - smoothstep(0.003, 0.006, border)) * dash;
  return Lot(use, cover, street, line);
}

/** An airfield's dry grass, mown in broad stripes running east to west, the way its runway runs. */
vec3 airfieldGrass(vec2 place) {
  float mown = 0.95 + 0.07 * step(0.5, fract((place.y + 5.5) * 12.0));
  return uAirfield * mown * (0.88 + 0.2 * fbm(place * 3.0));
}

/**
 * A suburb's gardens seen from above: crowns of grown trees, dark and clustered, with lawn
 * showing between them. The crowns fade into their average where they lie closer than the
 * screen's pixels, so a far suburb never shimmers.
 */
vec3 treeCanopy(vec2 place) {
  float crowns = valueNoise(place * 34.0);
  float blur = clamp(fwidth(place.x * 34.0) * 1.5, 0.0, 1.0);
  float crown = mix(crowns, 0.5, blur);
  float clumps = fbm(place * 5.0);
  vec3 leaves = uCanopy * mix(0.72, 1.18, smoothstep(0.25, 0.85, crown));
  float lawn = 1.0 - smoothstep(0.32, 0.5, clumps + crown * 0.35);
  return mix(leaves, uLawn * 0.92, lawn * 0.7);
}

/** The ground a lot is laid with, and its street where it borders another district. */
vec3 lotGround(vec2 place, Lot lot) {
  vec3 ground = lot.use < 1.5 ? farmland(place)
    : lot.use < 2.5 ? uLawn * (0.82 + 0.3 * fbm(place * 3.0))
    : lot.use < 3.5 ? uPaving * (0.9 + 0.14 * valueNoise(place * 6.0))
    : lot.use < 4.5 ? uDirt * (0.84 + 0.26 * fbm(place * 2.5))
    : lot.use < 5.5 ? airfieldGrass(place)
    : treeCanopy(place);
  vec3 street = mix(uAsphalt * (0.92 + 0.12 * valueNoise(place * 9.0)), uRoadLine, lot.line);
  return mix(ground, street, lot.street);
}
`;
