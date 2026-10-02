/** A colour as linear red, green and blue from 0 to 1. */
export type Rgb = readonly [number, number, number];

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Flat-shaded triangles as plain lists: three numbers a corner. */
export interface Triangles {
  readonly positions: number[];
  readonly colors: number[];
}

export interface BoxSpec {
  /** The middle of the box's floor. */
  readonly base: Vec3;
  readonly size: Vec3;
  readonly colour: Rgb;
}

/** A point in space as three numbers: x, y and z. */
export type Corner = readonly [number, number, number];

/**
 * The faces of a unit box that can be seen as corner indices, wound to face outward. Everything
 * stands on the ground or floats on the sea, so its floor never shows and is left out.
 */
const BOX_FACES: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 3, 2],
  [4, 6, 7, 5],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 5, 7, 3],
];

/** A box's top, of the faces in BOX_FACES: walls under a roof leave it out. */
const BOX_TOP = 2;

export function box(spec: BoxSpec): Triangles {
  return quads({ corners: boxCorners(spec), faces: BOX_FACES, colour: spec.colour });
}

/** A box's four sides alone, for a building whose roof covers its top. */
export function walls(spec: BoxSpec): Triangles {
  const sides = BOX_FACES.filter((_, face) => face !== BOX_TOP);
  return quads({ corners: boxCorners(spec), faces: sides, colour: spec.colour });
}

function boxCorners(spec: BoxSpec): Corner[] {
  const { base, size } = spec;
  return [0, 1, 2, 3, 4, 5, 6, 7].map((bits) => [
    base.x + ((bits & 4 ? 1 : 0) - 0.5) * size.x,
    base.y + (bits & 2 ? 1 : 0) * size.y,
    base.z + ((bits & 1 ? 1 : 0) - 0.5) * size.z,
  ]);
}

/** A gable roof: a triangular prism with its ridge running east to west. */
export function gableRoof(spec: BoxSpec): Triangles {
  const corners = roofCorners(spec);
  return merge([
    triangles({
      corners,
      faces: [
        [0, 1, 2],
        [3, 5, 4],
      ],
      colour: spec.colour,
    }),
    quads({
      corners,
      faces: [
        [1, 4, 5, 2],
        [0, 2, 5, 3],
      ],
      colour: spec.colour,
    }),
  ]);
}

/** The west gable's three corners, then the east's: two eaves and the ridge each. */
function roofCorners(spec: BoxSpec): Corner[] {
  const { base, size } = spec;
  const top = base.y + size.y;
  return [base.x - size.x / 2, base.x + size.x / 2].flatMap((x): Corner[] => [
    [x, base.y, base.z - size.z / 2],
    [x, base.y, base.z + size.z / 2],
    [x, top, base.z],
  ]);
}

/** A four-sided pyramid standing on its base. */
export function pyramid(spec: BoxSpec): Triangles {
  const { base, size } = spec;
  const corners: Corner[] = [
    [base.x - size.x / 2, base.y, base.z - size.z / 2],
    [base.x + size.x / 2, base.y, base.z - size.z / 2],
    [base.x + size.x / 2, base.y, base.z + size.z / 2],
    [base.x - size.x / 2, base.y, base.z + size.z / 2],
    [base.x, base.y + size.y, base.z],
  ];
  const faces: [number, number, number][] = [
    [0, 4, 1],
    [1, 4, 2],
    [2, 4, 3],
    [3, 4, 0],
  ];
  return triangles({ corners, faces, colour: spec.colour });
}

export interface PatchSpec {
  /** Its width (west to east) and depth (north to south), and how many cells its longer side is cut into. */
  readonly width: number;
  readonly depth: number;
  readonly cuts: number;
  /** How high its top lies, and how far down its edges hang: a skirt to meet uneven ground. */
  readonly top: number;
  readonly skirt: number;
  readonly colour: Rgb;
}

/**
 * A rectangle of ground cover, cut into a grid so it can be laid over rolling land, with its edges
 * hanging down so no gap shows where it meets the ground.
 */
export function patch(spec: PatchSpec): Triangles {
  return merge([patchTop(spec), patchSkirt(spec)]);
}

/** A flat rectangle with no skirt, for paint on something already laid: bay lines, lane marks. */
export function sheet(spec: Omit<PatchSpec, "skirt">): Triangles {
  return patchTop({ ...spec, skirt: 0 });
}

interface PatchGrid {
  readonly xs: readonly number[];
  readonly zs: readonly number[];
}

function patchTop(spec: PatchSpec): Triangles {
  const { xs, zs } = patchGrid(spec);
  const cells = xs.slice(1).flatMap((x1, col) =>
    zs.slice(1).map((z1, row): Corner[] => {
      const [x0, z0] = [xs[col], zs[row]];
      return [x0, x1, x1, x0].map((x, index): Corner => [x, spec.top, index < 2 ? z0 : z1]);
    }),
  );
  return merge(
    cells.map((corners) => quads({ corners, faces: [[0, 3, 2, 1]], colour: spec.colour })),
  );
}

/** The walls round the patch's edge, walked anticlockwise from above so each faces outward. */
function patchSkirt(spec: PatchSpec): Triangles {
  const ring = patchRing(patchGrid(spec));
  const walls = ring.slice(1).map(([x1, z1], index): Corner[] => {
    const [x0, z0] = ring[index];
    return [
      [x0, -spec.skirt, z0],
      [x1, -spec.skirt, z1],
      [x1, spec.top, z1],
      [x0, spec.top, z0],
    ];
  });
  return merge(
    walls.map((corners) => quads({ corners, faces: [[0, 1, 2, 3]], colour: spec.colour })),
  );
}

/** The patch's edge as (x, z) points, anticlockwise seen from above, ending where it began. */
function patchRing(grid: PatchGrid): (readonly [number, number])[] {
  const { xs, zs } = grid;
  const [west, east] = [xs[0], xs[xs.length - 1]];
  const [north, south] = [zs[0], zs[zs.length - 1]];
  return [
    ...xs.map((x) => [x, south] as const),
    ...zs
      .slice(0, -1)
      .reverse()
      .map((z) => [east, z] as const),
    ...xs
      .slice(0, -1)
      .reverse()
      .map((x) => [x, north] as const),
    ...zs.slice(1).map((z) => [west, z] as const),
  ];
}

/** Cells about square: a long strip is cut along its length, not across it. */
function patchGrid(spec: PatchSpec): PatchGrid {
  const longest = Math.max(spec.width, spec.depth);
  const cutsOf = (length: number) => {
    const cuts = Math.max(1, Math.round((spec.cuts * length) / longest));
    return Array.from({ length: cuts + 1 }, (_, index) => (index / cuts - 0.5) * length);
  };
  return { xs: cutsOf(spec.width), zs: cutsOf(spec.depth) };
}

export function merge(parts: readonly Triangles[]): Triangles {
  return {
    positions: parts.flatMap((part) => part.positions),
    colors: parts.flatMap((part) => part.colors),
  };
}

/** Faces as indices into a list of corners, each wound anticlockwise seen from outside. */
export interface Polygons<Face> {
  readonly corners: readonly Corner[];
  readonly faces: readonly Face[];
  readonly colour: Rgb;
}

export function quads(polygons: Polygons<readonly [number, number, number, number]>): Triangles {
  const faces = polygons.faces.flatMap(
    ([a, b, c, d]) =>
      [
        [a, b, c],
        [a, c, d],
      ] as [number, number, number][],
  );
  return triangles({ ...polygons, faces });
}

export function triangles(polygons: Polygons<readonly [number, number, number]>): Triangles {
  const corners = polygons.faces.flat().map((index) => polygons.corners[index]);
  return {
    positions: corners.flat(),
    colors: corners.flatMap(() => [...polygons.colour]),
  };
}

/** A "#rrggbb" colour (sRGB, as designers write them) in the linear space vertex colours use. */
export function rgb(hex: string): Rgb {
  const channel = (offset: number) => toLinear(parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return [channel(1), channel(3), channel(5)];
}

function toLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

export interface Placement {
  readonly offset: Vec3;
  /** Radians about the vertical axis, clockwise seen from above. */
  readonly turn: number;
  readonly scale?: number;
}

/** Scales triangles, turns them about the vertical axis, then moves them into place. */
export function placed(part: Triangles, at: Placement): Triangles {
  const scale = at.scale ?? 1;
  const cos = Math.cos(at.turn) * scale;
  const sin = Math.sin(at.turn) * scale;
  const positions = part.positions.slice();
  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const z = positions[index + 2];
    positions[index] = x * cos - z * sin + at.offset.x;
    positions[index + 1] = positions[index + 1] * scale + at.offset.y;
    positions[index + 2] = x * sin + z * cos + at.offset.z;
  }
  return { positions, colors: part.colors };
}
