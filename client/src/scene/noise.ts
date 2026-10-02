/** A point in a plane, x then y. */
export type Planar = readonly [number, number];

/**
 * The noise NOISE_GLSL draws with, line for line in TypeScript, for patterns worked out once on
 * the CPU that must match what the shaders draw: a hurricane's spiral, the same as its shadow's.
 */
function fract(value: number): number {
  return value - Math.floor(value);
}

/** A number from 0 to 1 for each cell, with no trigonometry (after Dave Hoskins' hash12). */
export function hash12(cell: Planar): number {
  const [x, y] = cell;
  let [px, py, pz] = [fract(x * 0.1031), fract(y * 0.1031), fract(x * 0.1031)];
  const spread = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  [px, py, pz] = [px + spread, py + spread, pz + spread];
  return fract((px + py) * pz);
}

/** Noise that drifts smoothly from 0 to 1 and back, about once a unit. */
export function valueNoise(at: Planar): number {
  const [cx, cy] = [Math.floor(at[0]), Math.floor(at[1])];
  const [fx, fy] = [at[0] - cx, at[1] - cy];
  const [ux, uy] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
  const a = hash12([cx, cy]);
  const b = hash12([cx + 1, cy]);
  const c = hash12([cx, cy + 1]);
  const d = hash12([cx + 1, cy + 1]);
  const [south, north] = [a + (b - a) * ux, c + (d - c) * ux];
  return south + (north - south) * uy;
}

/** Noise at four scales, each turned against the last, so no grid ever lines up. */
export function fbm(at: Planar): number {
  let [x, y] = at;
  let [sum, weight] = [0, 0.5];
  for (let octave = 0; octave < 4; octave += 1) {
    sum += valueNoise([x, y]) * weight;
    [x, y] = [1.6 * x - 1.2 * y + 17.1, 1.2 * x + 1.6 * y + 17.1];
    weight *= 0.5;
  }
  return sum / 0.9375;
}
