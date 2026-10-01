import { Color, ShaderMaterial, Vector3, type Texture } from "three";
import { CLOUD_SHADE_GLSL, shadowUniforms, type ShadowSpots } from "./cloud-shadows.js";
import { HAZE_GLSL, hazeUniforms } from "./haze-glsl.js";
import { LAND_USE_GLSL } from "./land-use-glsl.js";
import { lightUniforms } from "./light-uniforms.js";
import { NOISE_GLSL } from "./noise-glsl.js";
import { REEF_GLSL, reefUniforms } from "./reef-glsl.js";
import { SAND, WATER } from "./water-look.js";

const VERTEX = /* glsl */ `
attribute vec2 aShore;
varying vec2 vShore;
varying vec3 vNormal;
varying vec2 vPlace;
varying vec3 vWorld;
void main() {
  vShore = aShore;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPlace = world.xz;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uSunDirection;
uniform vec3 uSunColour;
uniform vec3 uSkyColour;
uniform vec3 uGroundColour;
uniform vec3 uDrySand;
uniform vec3 uWetSand;
uniform vec3 uSeabedSand;
uniform vec3 uSeagrass;
uniform vec3 uAbsorption;
uniform vec3 uDeepWater;
uniform vec3 uRubble;
uniform vec3 uCoral;
varying vec2 vShore;
varying vec3 vNormal;
varying vec2 vPlace;
varying vec3 vWorld;
${NOISE_GLSL}
${HAZE_GLSL}
${CLOUD_SHADE_GLSL}
${LAND_USE_GLSL}
${REEF_GLSL}

/** Sand seen from high up: broad drifts a shade lighter or darker, and the faintest grain. */
float sandTone(vec2 place) {
  return 0.9 + 0.16 * fbm(place * 0.45) + 0.05 * valueNoise(place * 9.0);
}

/** The beach: dry sand, darkening to wet sand where the waves wash up it. */
vec3 beach(vec2 place) {
  float dry = smoothstep(-0.4, 0.7, vShore.x);
  return mix(uWetSand, uDrySand, dry) * sandTone(place);
}

/** The sea floor: pale sand in faint ripples, and beds of sea grass out from the beach. */
vec3 seabed(vec2 place, float depth) {
  float patchy = smoothstep(0.45, 0.75, fbm(place * 0.3 + 5.0));
  float ripples = 1.0 + 0.025 * patchy * sin(place.y * 11.0 + fbm(place * 0.9) * 14.0);
  float beds = smoothstep(0.58, 0.72, fbm(place * 0.55 + 23.0)) * smoothstep(0.1, 0.35, depth);
  return mix(uSeabedSand * sandTone(place) * ripples, uSeagrass, beds * 0.85);
}

/** The steepest slant down the fore-reef: about what the side of the sea nearest the eye sees. */
const float FORE_REEF_SLANT = 2.0;

/**
 * How many times its depth of water the light crosses on its way up to the eye: as much as the
 * eye's slanting line of sight does, so a floor seen at a low angle sinks from view far sooner
 * than one seen from straight above. Down the fore-reef the slant is held back, so its long slope
 * fades into the deep alike on every side, not only on the side nearest the eye.
 */
float lineOfSight(float pastEdge) {
  float slant = 1.0 / max(0.12, normalize(cameraPosition - vWorld).y);
  return mix(slant, min(slant, FORE_REEF_SLANT), overReef(pastEdge));
}

/**
 * The floor seen down through this much water: the sea swallows red light first, then green, so
 * the pale sand turns turquoise, then teal, then gives way to the sea's own deep blue.
 */
vec3 throughWater(vec3 floorColour, float water, float shade) {
  vec3 passing = exp(-uAbsorption * water);
  return floorColour * passing + uDeepWater * (1.0 - shade * 0.4) * (1.0 - passing);
}

/** The reef's crest: pale coral rubble, patched with the dark heads of living coral. */
vec3 reefFloor(vec2 place) {
  float heads = smoothstep(0.55, 0.75, fbm(place * 4.0 + 11.0));
  return mix(uRubble * (0.9 + 0.2 * valueNoise(place * 9.0)), uCoral, heads * 0.8);
}

/**
 * The sea floor seen through the water, with the reef rising round the sailable sea and the
 * fore-reef sloping away into the open ocean, whose floor lies too deep to see at all.
 */
vec3 underwater(vec3 light, float shade) {
  float pastEdge = reefDistance(vPlace);
  vec3 ocean = uOcean * (1.0 - shade * 0.4);
  float offshore = beyondReef(pastEdge);
  if (offshore >= 1.0) return ocean;
  float depth = vShore.y;
  vec3 floorColour = mix(seabed(vPlace, depth), reefFloor(vPlace), reefCrest(pastEdge));
  vec3 seen = throughWater(floorColour * light, depth * lineOfSight(pastEdge), shade);
  return mix(seen, ocean, offshore);
}

vec3 daylight(vec3 normal, float shade) {
  float sun = max(dot(normal, uSunDirection), 0.0) * (1.0 - shade);
  return mix(uGroundColour, uSkyColour, normal.y * 0.5 + 0.5) + uSunColour * sun;
}

vec3 land(vec2 place, vec3 light) {
  Lot lot = lotAt(place, vShore.x);
  float inField = lot.cover * step(lot.use, 1.5);
  float plants = plantRows(place);
  float rim = lot.cover * (1.0 - smoothstep(0.35, 0.9, lot.cover));
  vec3 ground = mix(beach(place), lotGround(place, lot, plants), lot.cover) * (1.0 - rim * 0.45);
  return ground * light * mix(1.0, 0.82 + 0.3 * plants, inField);
}

void main() {
  vec3 normal = normalize(vNormal);
  float shade = cloudShade(vPlace);
  vec3 light = daylight(normal, shade);
  float depth = vShore.y;
  float wet = smoothstep(0.0, 0.015, depth);
  vec3 colour = wet < 1.0 ? land(vPlace, light) : vec3(0.0);
  if (wet > 0.0) colour = mix(colour, underwater(light, shade), wet);
  gl_FragColor = vec4(mix(colour, uHazeColour, hazeAt(vWorld) * (1.0 - wet)), 1.0);
  #include <colorspace_fragment>
}
`;

export interface TerrainSetting {
  readonly shadows: ShadowSpots;
  /** What covers each square's land, one texel a square. */
  readonly landUse: Texture;
}

/**
 * The land and the sea floor as a satellite photograph shows them, drawn from smooth noise so no
 * pattern ever repeats: bare sand on the islands, fields and districts' grounds wherever the
 * governors build, and the sea
 * floor coloured by the depth of water over it.
 */
export function terrainMaterial(setting: TerrainSetting): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...lightUniforms(),
      ...groundUniforms(),
      ...reefUniforms(),
      ...hazeUniforms(),
      ...landUseUniforms(setting.landUse),
      ...shadowUniforms(setting.shadows),
    },
  });
}

/** The sands, the sea floor, and how the water over it swallows the light. */
function groundUniforms() {
  const colour = (hex: string) => ({ value: new Color(hex) });
  const { red, green, blue } = WATER.absorption;
  return {
    uDrySand: colour(SAND.dry),
    uWetSand: colour(SAND.wet),
    uSeabedSand: colour(SAND.seabed),
    uSeagrass: colour(SAND.seagrass),
    uAbsorption: { value: new Vector3(red, green, blue) },
    uDeepWater: colour(WATER.deep),
    uRubble: colour(SAND.rubble),
    uCoral: colour(SAND.coral),
  };
}

function landUseUniforms(landUse: Texture) {
  const colour = (hex: string) => ({ value: new Color(hex) });
  return {
    uLandUse: { value: landUse },
    uSoil: colour("#7f6446"),
    uLeaf: colour("#567f3a"),
    uLawn: colour("#6f9a4c"),
    uPaving: colour("#a9a7a0"),
    uDirt: colour("#a48d68"),
    uAsphalt: colour("#55585e"),
    uRoadLine: colour("#e6d58a"),
  };
}
