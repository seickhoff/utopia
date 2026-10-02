import { HAZE_GLSL } from "./haze-glsl.js";
import { NOISE_GLSL } from "./noise-glsl.js";

/**
 * A puff of cloud: a square turned to face the camera wherever it looks from, one for each puff
 * of each cloud in a single draw. Each puff brings its place and size, its colours in sun and
 * shade, how high up its heap it sits, and how brightly lightning lights it.
 */
export const PUFF_VERTEX = /* glsl */ `
attribute vec4 aPlace;
attribute vec3 aLight;
attribute vec3 aShade;
attribute vec2 aGlow;
uniform vec3 uSun;
varying vec2 vCorner;
varying vec2 vSunward;
varying vec3 vLight;
varying vec3 vShade;
varying vec2 vGlow;
varying float vSeed;
varying vec3 vWorld;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 world = aPlace.xyz + (right * position.x + up * position.y) * aPlace.w;
  vCorner = position.xy;
  vSunward = normalize(vec2(dot(uSun, right), dot(uSun, up)) + vec2(0.0, 0.001));
  vLight = aLight;
  vShade = aShade;
  vGlow = aGlow;
  vSeed = aPlace.x * 3.7 + aPlace.z * 5.3;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

/**
 * A puff seen from wherever the camera is: round, its rim broken up into lumps and fading out,
 * lit on its crown and its side toward the sun, grey beneath, the puffs higher up the heap the
 * brighter, and lit up from within, most of all low down, when lightning flashes.
 */
export const PUFF_FRAGMENT = /* glsl */ `
varying vec2 vCorner;
varying vec2 vSunward;
varying vec3 vLight;
varying vec3 vShade;
varying vec2 vGlow;
varying float vSeed;
varying vec3 vWorld;
/**
 * A puff is see-through enough that a heap of them is thick only in its middle and wispy at its
 * edges, and lightning beneath always shows; and thinner still while lightning flashes in it.
 */
const float PUFF_OPACITY = 0.5;
const float FLASH_THINNING = 0.35;
${NOISE_GLSL}
${HAZE_GLSL}

void main() {
  float lumps = valueNoise(vCorner * 2.2 + vSeed) - 0.5;
  float rim = length(vCorner) + lumps * 0.35;
  float alpha = (1.0 - smoothstep(0.45, 1.0, rim)) * PUFF_OPACITY * (1.0 - FLASH_THINNING * vGlow.y);
  if (alpha < 0.01) discard;
  float sunward = dot(vCorner, vSunward) * 0.5 + 0.5;
  float crown = vCorner.y * 0.5 + 0.5;
  float lit = clamp(0.12 + vGlow.x * 0.45 + sunward * 0.28 + crown * 0.25, 0.0, 1.0);
  vec3 colour = mix(vShade, vLight, lit);
  colour += vGlow.y * vec3(0.75, 0.8, 1.0) * (1.1 - vGlow.x * 0.6);
  gl_FragColor = vec4(mix(colour, uHazeColour, hazeAt(vWorld)), alpha);
  #include <colorspace_fragment>
}
`;
