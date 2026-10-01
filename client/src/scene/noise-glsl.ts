/**
 * Smooth noise in shader code, for surfaces that must never show a repeating pattern: the sand,
 * the sea floor, the waves and the clouds. Include it once, before any code that uses it.
 */
export const NOISE_GLSL = /* glsl */ `
/** A number from 0 to 1 for each cell, with no trigonometry (after Dave Hoskins' hash12). */
float hash12(vec2 cell) {
  vec3 p = fract(vec3(cell.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

/** Noise that drifts smoothly from 0 to 1 and back, about once a unit. */
float valueNoise(vec2 at) {
  vec2 cell = floor(at);
  vec2 f = fract(at);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/** Noise at four scales, each turned against the last, so no grid ever lines up. */
float fbm(vec2 at) {
  float sum = 0.0;
  float weight = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    sum += valueNoise(at) * weight;
    at = mat2(1.6, 1.2, -1.2, 1.6) * at + 17.1;
    weight *= 0.5;
  }
  return sum / 0.9375;
}
`;
