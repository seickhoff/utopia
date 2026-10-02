import { fbm, type Planar } from "./noise.js";

/** How many texels the spiral's map is across, and down. */
export const MAP_SIZE = 256;

function smoothstep(edges: Planar, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edges[0]) / (edges[1] - edges[0])));
  return t * t * (3 - 2 * t);
}

/**
 * How thick a hurricane is at a point of its disc, as it stands before it has turned at all: the
 * spiral CLOUD_SHAPE_GLSL draws, line for line, so the storm's body is its shadow's shape.
 */
export function hurricaneDensity(point: { disc: Planar; seed: number }): number {
  const [x, y] = point.disc;
  const { seed } = point;
  const r = Math.max(Math.hypot(x, y), 0.001);
  const turn = Math.atan2(y, x) + 3 * Math.log(r);
  const [cos, sin, log] = [Math.cos(turn), Math.sin(turn), Math.log(r)];
  const coarse = fbm([cos * 2.2 + log * 0.9 + seed * 11, sin * 2.2 + log * 0.5 + seed * 11]);
  const fine = fbm([cos * 4 + log * 1.6 + seed * 5, sin * 4 + log * 1.1 + seed * 5]);
  const arms = smoothstep([-0.35, 0.85], Math.cos(turn * 2 + coarse * 3));
  const core = 1 - smoothstep([0.26, 0.52], r + (coarse - 0.5) * 0.22);
  const eye = smoothstep([0.045, 0.1], r);
  const rim = 1 - smoothstep([0.62, 1], r);
  const bands = arms * (0.55 + 0.55 * fine) * rim;
  const outflow = fine * fine * 0.5 * rim;
  return Math.min(1, Math.max(0, Math.max(core * (0.88 + 0.24 * fine), bands, outflow) * eye));
}

/**
 * A hurricane's spiral as a map, a byte a texel, over its disc from -1 to 1 each way (x east, y
 * north), clear past its rim: worked out once, then turned in the shader as the storm turns.
 */
export function hurricaneMap(seed: number): Uint8Array {
  const map = new Uint8Array(MAP_SIZE * MAP_SIZE);
  for (let texel = 0; texel < map.length; texel += 1) {
    const disc: Planar = [
      ((texel % MAP_SIZE) + 0.5) / (MAP_SIZE / 2) - 1,
      (Math.floor(texel / MAP_SIZE) + 0.5) / (MAP_SIZE / 2) - 1,
    ];
    const inside = disc[0] * disc[0] + disc[1] * disc[1] < 1;
    map[texel] = inside ? Math.round(hurricaneDensity({ disc, seed }) * 255) : 0;
  }
  return map;
}
