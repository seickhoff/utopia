import { NOISE_GLSL } from "./noise-glsl.js";

/**
 * A school's quad, lying just under the surface. Each corner carries its school: (centre x,
 * centre z, seed, shown), so every school moves with one small attribute update and no new
 * geometry; a school not shown collapses to a point and draws nothing.
 */
export const FISH_VERTEX = /* glsl */ `
attribute vec2 aCorner;
attribute vec4 aSchool;
uniform float uRadius;
varying vec2 vDisc;
varying float vSeed;
void main() {
  vDisc = aCorner;
  vSeed = aSchool.z;
  vec2 reach = aCorner * uRadius * aSchool.w;
  vec3 world = vec3(aSchool.x + reach.x, 0.012, aSchool.y - reach.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

/**
 * A school of fish from above, milling rather than circling: each fish wanders its own looping
 * path through the shoal at its own pace, and swims at its own depth. The deep ones are small,
 * faint and blue with the water over them; the shallow ones are sharp and flash silver as they
 * turn. The dark mass of the shoal shifts shape as the fish move.
 */
export const FISH_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uBacks;
uniform vec3 uSilver;
uniform vec3 uWater;
varying vec2 vDisc;
varying float vSeed;
${NOISE_GLSL}

const int FISH = 24;

/** One fish at this moment: where it is (xy) and which way it is swimming (zw). */
vec4 swimming(float index) {
  vec4 dice = vec4(
    hash12(vec2(index, vSeed * 7.0 + 1.3)),
    hash12(vec2(index, vSeed * 7.0 + 2.7)),
    hash12(vec2(index, vSeed * 7.0 + 4.1)),
    hash12(vec2(index, vSeed * 7.0 + 5.9))
  );
  vec2 pace = 0.5 + 0.9 * dice.xy;
  vec2 phase = uTime * pace + 6.2832 * dice.zw;
  vec2 reach = vec2(0.52, 0.42) * (0.6 + 0.4 * dice.yx);
  vec2 place = vec2(sin(phase.x), sin(phase.y)) * reach;
  vec2 heading = vec2(cos(phase.x) * pace.x, cos(phase.y) * pace.y) * reach;
  return vec4(place, heading);
}

/** How much of one fish covers this point, and how brightly it flashes. */
vec2 fishAt(vec2 disc, float index, float depth) {
  vec4 fish = swimming(index);
  vec2 heading = normalize(fish.zw + 1e-4);
  vec2 offset = disc - fish.xy;
  vec2 local = vec2(dot(offset, heading), dot(offset, vec2(-heading.y, heading.x)));
  vec2 size = vec2(0.11, 0.036) * mix(1.0, 0.68, depth);
  float softness = mix(0.72, 0.4, depth);
  float body = 1.0 - smoothstep(softness, 1.0, length(local / size));
  float turning = smoothstep(0.9, 0.99, sin(uTime * (0.7 + hash12(vec2(index, 9.1))) + index * 2.3));
  return vec2(body, turning * (1.0 - depth));
}

void main() {
  float r = length(vDisc * vec2(1.0, 1.2));
  if (r > 1.0) discard;
  float lumps = valueNoise(vDisc * 2.2 + vec2(uTime * 0.2, -uTime * 0.15) + vSeed * 9.0);
  float shoal = 1.0 - smoothstep(0.25, 0.95, r + (lumps - 0.5) * 0.45);
  vec4 colour = vec4(uBacks, shoal * 0.3);
  for (int index = 0; index < FISH; index++) {
    float depth = 1.0 - float(index) / float(FISH - 1);
    vec2 fish = fishAt(vDisc, float(index), depth);
    vec3 back = mix(uBacks, uWater, depth * 0.55);
    vec4 seen = vec4(mix(back, uSilver, fish.y), mix(0.9, 0.35, depth));
    colour = mix(colour, seen, fish.x);
  }
  gl_FragColor = colour;
  #include <colorspace_fragment>
}
`;
