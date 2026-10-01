import { CLOUD_SHADE_GLSL } from "./cloud-shadows.js";
import { HAZE_GLSL } from "./haze-glsl.js";
import { NOISE_GLSL } from "./noise-glsl.js";
import { REEF_GLSL } from "./reef-glsl.js";

/** The sea's vertex shader: passes each point's place on the sea to the fragment shader. */
export const SEA_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * The sea's surface, a thin see-through skin over the sea floor (whose colour, deepening with the
 * water, the terrain draws; past the floor's edge, the deep ocean shows through): wind ripples
 * catching the sky, white surf on the beaches and the reef, and the whole sea running on to the
 * horizon, mirroring more of the sky the farther off it lies, into the haze.
 */
export const SEA_FRAGMENT = /* glsl */ `
uniform sampler2D uShore;
uniform vec4 uShoreMap;
uniform float uTime;
uniform vec3 uSky;
uniform vec3 uSurf;
uniform vec3 uDeep;
uniform vec3 uSunDirection;
varying vec3 vWorld;
${NOISE_GLSL}
${HAZE_GLSL}
${CLOUD_SHADE_GLSL}
${REEF_GLSL}

/** Pixels out to sea from the nearest shore; 0 on land. */
float offshore(vec2 place) {
  vec2 pixel = vec2((place.x + 10.0) * 8.0, (place.y + 5.5) * 8.0) + uShoreMap.x;
  vec2 uv = pixel / uShoreMap.yz;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uShoreMap.w;
  return max(0.0, uShoreMap.w - texture2D(uShore, uv).r * uShoreMap.w * 2.0);
}

/** The height of the wind's little waves, drifting downwind. */
float waves(vec2 place) {
  return valueNoise(place * 2.2 + uTime * vec2(0.32, 0.1)) * 0.65
    + valueNoise(place * 5.3 - uTime * vec2(0.12, 0.38)) * 0.35;
}

/**
 * Which way the water's surface faces here. Far off, the little waves are too small to make out
 * and the sea lies smooth, which keeps the distance from breaking into a shimmering grid.
 */
vec3 waveNormal(vec2 place, float away) {
  float height = waves(place);
  vec2 slope = vec2(waves(place + vec2(0.04, 0.0)), waves(place + vec2(0.0, 0.04))) - height;
  float choppy = 3.0 * (1.0 - smoothstep(12.0, 90.0, away));
  return normalize(vec3(-slope.x * choppy, 1.0, -slope.y * choppy));
}

/** Surf breaking on the barrier reef, rolling in from the ocean: the edge of the sailable sea. */
float reefSurf(vec2 place) {
  float pastEdge = reefDistance(place);
  float line = 1.0 - smoothstep(0.02, 0.14, abs(pastEdge - uReef.z - 0.05));
  float rolling = 0.62 + 0.38 * sin(uTime * 1.3 + pastEdge * 9.0 + place.x * 0.6 + place.y * 0.4);
  return line * rolling * (0.35 + 0.65 * valueNoise(place * 6.0 + uTime * vec2(0.3, -0.2)));
}

/**
 * How much of the sky the water mirrors (Schlick's Fresnel): next to nothing looking down into it,
 * more and more looking out across it, so the far sea turns to a bright, reflecting plain.
 */
float skyReflection(vec3 normal, vec3 world) {
  float facing = max(dot(normal, normalize(cameraPosition - world)), 0.0);
  return 0.85 * pow(1.0 - facing, 5.0);
}

/** White water where waves break on the beach, surging in and out, broken into flecks. */
float surf(vec2 place, float seaward) {
  float surge = 0.6 + 0.4 * sin(uTime * 1.3 + place.x * 1.7 + place.y * 2.1);
  float band = 1.0 - smoothstep(0.3, 1.1 + 0.9 * surge, seaward);
  return band * (0.5 + 0.5 * valueNoise(place * 6.0 + uTime * 0.25));
}

void main() {
  vec2 place = vWorld.xz;
  float shade = cloudShade(place);
  vec3 normal = waveNormal(place, length(cameraPosition - vWorld));
  float catching = clamp(0.5 + 4.0 * dot(normal.xz, uSunDirection.xz), 0.0, 1.0);
  float sheen = 0.05 + 0.07 * catching;
  float foam = max(surf(place, offshore(place)), reefSurf(place) * 0.9);
  float mirror = skyReflection(normal, vWorld);
  float sky = sheen + mirror;
  float alpha = clamp(sky + foam, 0.0, 1.0);
  vec3 colour = (uSky * (1.0 - shade * 0.5) * sky + uSurf * foam) / max(alpha, 0.001);
  float haze = hazeAt(vWorld);
  gl_FragColor = vec4(mix(colour, uHazeColour, haze), mix(alpha, 1.0, haze));
  #include <colorspace_fragment>
}
`;
