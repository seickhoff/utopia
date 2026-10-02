import { HAZE_GLSL } from "./haze-glsl.js";
import { NOISE_GLSL } from "./noise-glsl.js";

/** A hurricane's bounding drum: passes on where each point of its skin lies in the world. */
export const HURRICANE_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

/**
 * A hurricane with a real body, seen from wherever the camera is: each ray through its drum is
 * walked step by step, gathering cloud wherever the spiral is dense enough for that height, so
 * its arms lie low and dark and its core round the eye towers white. Seen from above it is its
 * spiral; from the side it is a wall of cloud.
 */
export const HURRICANE_FRAGMENT = /* glsl */ `
uniform sampler2D uSpiral;
uniform vec3 uCentre;
uniform vec2 uSize;
uniform float uTurn;
uniform vec3 uLight;
uniform vec3 uShade;
varying vec3 vWorld;
const int STEPS = 28;
/** How quickly cloud hides what lies behind it: so much of the light a unit of thick cloud stops. */
const float THICKNESS = 4.5;
${HAZE_GLSL}

/** How far a ray from a point on the drum's skin runs through the drum before it leaves. */
float throughStorm(vec3 from, vec3 ray) {
  vec2 offset = from.xz - uCentre.xz;
  float a = dot(ray.xz, ray.xz);
  float b = dot(offset, ray.xz);
  float c = dot(offset, offset) - uSize.x * uSize.x;
  float side = a > 1e-6 ? (-b + sqrt(max(b * b - a * c, 0.0))) / a : 1e4;
  float roof = ray.y > 1e-6 ? (uCentre.y + uSize.y - from.y) / ray.y : 1e4;
  float base = ray.y < -1e-6 ? (uCentre.y - from.y) / ray.y : 1e4;
  return max(0.0, min(side, min(roof, base)));
}

/** How much cloud there is at a point inside the drum: wherever the spiral is dense enough for its height. */
float cloudAt(vec3 point, vec2 turning) {
  vec2 disc = vec2(point.x - uCentre.x, uCentre.z - point.z) / uSize.x;
  if (dot(disc, disc) >= 1.0) return 0.0;
  vec2 turned = vec2(disc.x * turning.x - disc.y * turning.y, disc.x * turning.y + disc.y * turning.x);
  float spiral = texture2D(uSpiral, turned * 0.5 + 0.5).r;
  float up = clamp((point.y - uCentre.y) / uSize.y, 0.0, 1.0);
  float needed = mix(0.1, 0.72, up);
  return smoothstep(needed - 0.06, needed + 0.3, spiral);
}

void main() {
  vec3 ray = normalize(vWorld - cameraPosition);
  float stride = throughStorm(vWorld, ray) / float(STEPS);
  vec2 turning = vec2(cos(uTurn), sin(uTurn));
  vec3 colour = vec3(0.0);
  float alpha = 0.0;
  for (int walked = 0; walked < STEPS; walked++) {
    vec3 point = vWorld + ray * (float(walked) + 0.5) * stride;
    float cloud = cloudAt(point, turning);
    float up = clamp((point.y - uCentre.y) / uSize.y, 0.0, 1.0);
    float taken = (1.0 - exp(-cloud * THICKNESS * stride)) * (1.0 - alpha);
    colour += mix(uShade, uLight, 0.12 + 0.85 * up) * taken;
    alpha += taken;
    if (alpha > 0.97) break;
  }
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(mix(colour / alpha, uHazeColour, hazeAt(vWorld)), alpha);
  #include <colorspace_fragment>
}
`;

/**
 * The funnel hanging from a hurricane's eye down to the sea: a cylinder drawn in as it falls,
 * like a tornado's, swaying a little as it turns. Each point passes on how far round the funnel
 * and how far up it lies.
 */
export const FUNNEL_VERTEX = /* glsl */ `
uniform vec3 uCentre;
uniform vec2 uReach;
uniform float uTime;
varying vec2 vFunnel;
varying vec3 vWorld;
varying vec3 vOutward;
void main() {
  float up = uv.y;
  float reach = mix(uReach.x, uReach.y, pow(up, 1.8));
  float sway = sin(up * 3.0 + uTime * 0.8) * 0.04 * (1.0 - up);
  vec3 world = vec3(uCentre.x + position.x * reach + sway, uCentre.y * up, uCentre.z + position.z * reach);
  vFunnel = uv;
  vWorld = world;
  vOutward = normalize(vec3(position.x, 0.0, position.z));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

/**
 * The funnel: mostly see-through, streaked with cloud swirling up and round it, a little denser
 * where its side is seen edge-on, as a funnel's is, and fading out where it meets the sea and the cloud.
 */
export const FUNNEL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uLight;
uniform vec3 uShade;
varying vec2 vFunnel;
varying vec3 vWorld;
varying vec3 vOutward;
${NOISE_GLSL}

void main() {
  float swirl = sin(vFunnel.x * 31.416 + vFunnel.y * 9.0 - uTime * 4.0) * 0.5 + 0.5;
  float wisps = valueNoise(vec2(vFunnel.x * 24.0, vFunnel.y * 6.0 - uTime));
  float streaks = mix(0.6, 1.4, swirl * (0.5 + 0.5 * wisps));
  float edgeOn = 1.0 - abs(dot(normalize(cameraPosition - vWorld), vOutward));
  float ends = smoothstep(0.0, 0.08, vFunnel.y) * (1.0 - smoothstep(0.9, 1.0, vFunnel.y));
  float alpha = uOpacity * streaks * mix(0.7, 1.3, edgeOn) * ends;
  vec3 colour = mix(uShade, uLight, 0.35 + 0.35 * swirl);
  gl_FragColor = vec4(colour, alpha);
  #include <colorspace_fragment>
}
`;
