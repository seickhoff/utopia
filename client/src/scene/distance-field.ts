/** A grid of numbers the size of the land mask. */
export interface Field {
  readonly width: number;
  readonly height: number;
  readonly values: Float32Array;
}

const FAR = 1e9;

/**
 * How far each pixel is from the shore, in pixels: positive on land (the distance to the nearest
 * water), negative at sea (the distance to the nearest land). Exact Euclidean distances, by two
 * passes of Felzenszwalb and Huttenlocher's transform.
 */
export function signedDistance(mask: Uint8Array, width: number): Field {
  const height = mask.length / width;
  const toWater = distanceTo({ mask, width, wanted: 0 });
  const toLand = distanceTo({ mask, width, wanted: 1 });
  const values = new Float32Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    values[index] = mask[index] === 1 ? toWater[index] - 0.5 : 0.5 - toLand[index];
  }
  return { width, height, values };
}

interface Search {
  readonly mask: Uint8Array;
  readonly width: number;
  readonly wanted: number;
}

/** Each pixel's distance to the nearest pixel of the wanted kind. */
function distanceTo(search: Search): Float32Array {
  const { mask, width, wanted } = search;
  const height = mask.length / width;
  const squared = Float64Array.from(mask, (value) => (value === wanted ? 0 : FAR));
  for (let x = 0; x < width; x += 1)
    transformLine(squared, { start: x, stride: width, count: height });
  for (let y = 0; y < height; y += 1)
    transformLine(squared, { start: y * width, stride: 1, count: width });
  return Float32Array.from(squared, Math.sqrt);
}

interface Line {
  readonly start: number;
  readonly stride: number;
  readonly count: number;
}

/** The 1D squared-distance transform along one row or column, in place. */
function transformLine(grid: Float64Array, line: Line): void {
  const values = Array.from({ length: line.count }, (_, i) => grid[line.start + i * line.stride]);
  const envelope = lowerEnvelope(values);
  let segment = 0;
  for (let q = 0; q < line.count; q += 1) {
    while (envelope.bounds[segment + 1] < q) segment += 1;
    const site = envelope.sites[segment];
    grid[line.start + q * line.stride] = (q - site) * (q - site) + values[site];
  }
}

interface Envelope {
  readonly sites: number[];
  readonly bounds: number[];
}

/** The parabolas that lie lowest, and where each gives way to the next. */
function lowerEnvelope(values: readonly number[]): Envelope {
  const sites = [0];
  const bounds = [-Infinity, Infinity];
  for (let q = 1; q < values.length; q += 1) {
    let crossing = intersection({ values, from: sites[sites.length - 1], to: q });
    while (crossing <= bounds[sites.length - 1]) {
      sites.pop();
      bounds.pop();
      crossing = intersection({ values, from: sites[sites.length - 1], to: q });
    }
    sites.push(q);
    bounds[sites.length - 1] = crossing;
    bounds[sites.length] = Infinity;
  }
  return { sites, bounds };
}

function intersection(pair: { values: readonly number[]; from: number; to: number }): number {
  const { values, from, to } = pair;
  return (values[to] + to * to - (values[from] + from * from)) / (2 * to - 2 * from);
}

/** A field's value at a fractional pixel position, blended from the four around it. */
export function sampleField(field: Field, at: { x: number; y: number }): number {
  const x = Math.min(field.width - 1, Math.max(0, at.x - 0.5));
  const y = Math.min(field.height - 1, Math.max(0, at.y - 0.5));
  const left = Math.floor(x);
  const top = Math.floor(y);
  const right = Math.min(field.width - 1, left + 1);
  const bottom = Math.min(field.height - 1, top + 1);
  const across = x - left;
  const down = y - top;
  const value = (col: number, row: number) => field.values[row * field.width + col];
  const upper = value(left, top) * (1 - across) + value(right, top) * across;
  const lower = value(left, bottom) * (1 - across) + value(right, bottom) * across;
  return upper * (1 - down) + lower * down;
}
