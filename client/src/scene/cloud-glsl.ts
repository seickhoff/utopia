/**
 * The shapes of clouds, in shader code shared by the clouds themselves and by every surface their
 * shadows fall on, so a shadow is always its own cloud's shape. A cloud is drawn on a disc, -1 to
 * 1 each way, x to the east and y to the north; its shape is a vec4 of (seed, spiral 0 or 1, the
 * time, unused). It needs NOISE_GLSL included before it.
 */
/** How fast a hurricane's spiral turns, radians a second, anticlockwise seen from above. */
export const HURRICANE_SPIN = 0.35;

export const CLOUD_SHAPE_GLSL = /* glsl */ `
/** How deep a heaped cumulus is: most in the middle, in lumps toward its rim, none past it. */
float cumulusDepth(vec2 disc, float seed) {
  float heap = fbm(disc * 2.6 + seed * 37.0);
  return heap + 0.5 - dot(disc, disc) * 1.1 - 0.38;
}

float cumulus(vec2 disc, float seed) {
  return smoothstep(0.0, 0.2, cumulusDepth(disc, seed));
}

/**
 * A hurricane seen from space: a great dense core round a small clear eye, and broad bands that
 * wind out clockwise (so the storm turns anticlockwise), streaked, fraying into wisps at the rim.
 */
float hurricane(vec2 disc, float seed, float time) {
  float r = max(length(disc), 0.001);
  float turn = atan(disc.y, disc.x) + 3.0 * log(r) - time * ${HURRICANE_SPIN.toFixed(2)};
  vec2 ring = vec2(cos(turn), sin(turn));
  float coarse = fbm(ring * 2.2 + log(r) * vec2(0.9, 0.5) + seed * 11.0);
  float fine = fbm(ring * 4.0 + log(r) * vec2(1.6, 1.1) + seed * 5.0);
  float arms = smoothstep(-0.35, 0.85, cos(turn * 2.0 + coarse * 3.0));
  float core = 1.0 - smoothstep(0.26, 0.52, r + (coarse - 0.5) * 0.22);
  float eye = smoothstep(0.045, 0.1, r);
  float rim = 1.0 - smoothstep(0.62, 1.0, r);
  float bands = arms * (0.55 + 0.55 * fine) * rim;
  float outflow = fine * fine * 0.5 * rim;
  return clamp(max(core * (0.88 + 0.24 * fine), max(bands, outflow)) * eye, 0.0, 1.0);
}

/** How thick a cloud is at this point of its disc, 0 to 1. */
float cloudDensity(vec2 disc, vec4 shape) {
  if (dot(disc, disc) >= 1.0) return 0.0;
  if (shape.y > 0.5) return hurricane(disc, shape.x, shape.z);
  return cumulus(disc, shape.x);
}

/** How deep a cloud is here, as the height of its top: for lighting its lumps. */
float cloudDepth(vec2 disc, vec4 shape) {
  if (shape.y > 0.5) return hurricane(disc, shape.x, shape.z) * 0.4;
  return cumulusDepth(disc, shape.x);
}
`;
