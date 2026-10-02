import { NOISE_GLSL } from "./noise-glsl.js";

/**
 * A fish of a school, just under the surface, swimming on its own: each fish wanders its own
 * looping path through the shoal at its own pace and heads whichever way its path takes it, its
 * tail wagging as it goes. Its school's place comes from a uniform, so the fish need no new
 * geometry as schools move; a school not shown shrinks its fish to nothing.
 */
export const FISH_VERTEX = /* glsl */ `
attribute vec4 aFish;
attribute float aShine;
uniform vec4 uSchools[2];
uniform float uTime;
uniform float uRadius;
uniform float uLength;
varying float vShine;
varying float vDepth;
varying float vFlash;
${NOISE_GLSL}

/**
 * A fish at this moment: where it is in its school (xy), and which way it is swimming (zw). Each
 * fish keeps to its own spot in the school, scattered through it, milling on a loop round that
 * spot, so the school fills in as a body of fish, each heading its own way.
 */
vec4 swimming(float seed) {
  vec4 dice = vec4(
    hash12(vec2(seed, 1.3)),
    hash12(vec2(seed, 2.7)),
    hash12(vec2(seed, 4.1)),
    hash12(vec2(seed, 5.9))
  );
  float bearing = 6.2832 * hash12(vec2(seed, 7.7));
  vec2 home = vec2(cos(bearing), sin(bearing) * 0.8) * 0.55 * sqrt(hash12(vec2(seed, 3.3)));
  vec2 pace = 0.5 + 0.9 * dice.xy;
  vec2 phase = uTime * pace + 6.2832 * dice.zw;
  vec2 reach = vec2(0.24, 0.2) * (0.6 + 0.4 * dice.yx);
  vec2 place = home + vec2(sin(phase.x), sin(phase.y)) * reach;
  vec2 heading = vec2(cos(phase.x) * pace.x, cos(phase.y) * pace.y) * reach;
  return vec4(place, heading);
}

void main() {
  vec4 school = aFish.x < 0.5 ? uSchools[0] : uSchools[1];
  float seed = aFish.y * 977.0 + school.z * 7.0;
  vec4 fish = swimming(seed);
  vec2 heading = normalize(fish.zw + 1e-4);
  float wag = sin(uTime * 60.0 * (0.8 + 0.4 * hash12(vec2(seed, 8.3))) + seed);
  float tail = smoothstep(0.1, -0.5, position.x);
  float size = uLength * aFish.w * mix(1.0, 0.82, aFish.z) * school.w;
  vec2 body = vec2(position.x, position.z + wag * 0.1 * tail) * size;
  vec2 turned = vec2(body.x * heading.x - body.y * heading.y, body.x * heading.y + body.y * heading.x);
  vec2 place = school.xy + fish.xy * uRadius;
  float rides = 0.004 + 0.008 * (1.0 - aFish.z) + position.y * size;
  vShine = aShine;
  vDepth = aFish.z;
  float turning = sin(uTime * (0.7 + hash12(vec2(seed, 9.1))) + seed * 2.3);
  vFlash = smoothstep(0.9, 0.99, turning) * (1.0 - aFish.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(place.x + turned.x, rides, place.y + turned.y, 1.0);
}
`;

/**
 * A fish seen from above: its back nearly black, its flanks lightly silvered, flashing silver as
 * it turns; dark enough to stand out against the bright shallows, the deep ones only a little
 * softened by the water over them.
 */
export const FISH_FRAGMENT = /* glsl */ `
uniform vec3 uBacks;
uniform vec3 uSilver;
uniform vec3 uWater;
varying float vShine;
varying float vDepth;
varying float vFlash;

/** How far a deep fish's colour is lost in the water over it, and how much of it still shows. */
const float DEEP_TINT = 0.15;
const float DEEP_OPACITY = 0.9;

void main() {
  vec3 fish = mix(uBacks, mix(uBacks, uSilver, 0.5), vShine);
  fish = mix(fish, uSilver, vFlash);
  fish = mix(fish, uWater, vDepth * DEEP_TINT);
  gl_FragColor = vec4(fish, mix(1.0, DEEP_OPACITY, vDepth));
  #include <colorspace_fragment>
}
`;
