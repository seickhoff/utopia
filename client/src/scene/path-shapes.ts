import { merge, quads, triangles, type Corner, type Rgb, type Triangles } from "./shapes.js";

/** A point on the floor seen from above: x to the east and z to the south. */
export type Spot = readonly [number, number];

/** Points along a straight line from one spot to another: one more than its steps. */
export function straight(stretch: { from: Spot; to: Spot; steps: number }): Spot[] {
  const { from, to, steps } = stretch;
  return Array.from({ length: steps + 1 }, (_, step): Spot => [
    from[0] + ((to[0] - from[0]) * step) / steps,
    from[1] + ((to[1] - from[1]) * step) / steps,
  ]);
}

/**
 * A smooth path winding through points in turn, passing through every one, with so many steps
 * between each and the next: a Catmull-Rom spline, its ends carried on as they began.
 */
export function curve(spec: { through: readonly Spot[]; steps: number }): Spot[] {
  const { through, steps } = spec;
  const at = (index: number) => through[Math.max(0, Math.min(through.length - 1, index))];
  const spans = through.slice(1).flatMap((_, span) =>
    Array.from({ length: steps }, (__, step) =>
      catmullRom({
        points: [at(span - 1), at(span), at(span + 1), at(span + 2)],
        share: step / steps,
      }),
    ),
  );
  return [...spans, through[through.length - 1]];
}

/** A point a share of the way from the second of four points to the third, on the curve through all four. */
function catmullRom(span: { points: readonly Spot[]; share: number }): Spot {
  const [p0, p1, p2, p3] = span.points;
  const t = span.share;
  const blend = (axis: 0 | 1) =>
    0.5 *
    (2 * p1[axis] +
      (p2[axis] - p0[axis]) * t +
      (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t * t +
      (3 * p1[axis] - p0[axis] - 3 * p2[axis] + p3[axis]) * t * t * t);
  return [blend(0), blend(1)];
}

export interface ArcSpec {
  readonly centre: Spot;
  readonly radius: number;
  /** Radians, growing from east toward south: clockwise seen from above. */
  readonly from: number;
  readonly to: number;
  readonly steps: number;
}

/** Points round a circle from one angle to another: one more than its steps. */
export function arc(spec: ArcSpec): Spot[] {
  return Array.from({ length: spec.steps + 1 }, (_, step): Spot => {
    const angle = spec.from + ((spec.to - spec.from) * step) / spec.steps;
    return [
      spec.centre[0] + Math.cos(angle) * spec.radius,
      spec.centre[1] + Math.sin(angle) * spec.radius,
    ];
  });
}

export interface RibbonSpec {
  /** The ribbon's middle, point by point: a cell of it to each step, short enough to lie over rolling land. */
  readonly path: readonly Spot[];
  readonly width: number;
  /** How high above the floor it lies. */
  readonly top: number;
  readonly colour: Rgb;
}

/** A flat strip laid along a path, facing the sky: a street, a running track, a painted line. */
export function ribbon(spec: RibbonSpec): Triangles {
  const { right, left } = edgesOf(spec);
  const at = ([x, z]: Spot): Corner => [x, spec.top, z];
  const cells = right.slice(1).map((_, index) => {
    const corners = [right[index], right[index + 1], left[index + 1], left[index]].map(at);
    return quads({ corners, faces: [[0, 1, 2, 3]], colour: spec.colour });
  });
  return merge(cells);
}

/** Walls hanging from both a ribbon's edges to below the floor, so no gap shows where it meets uneven ground. */
export function ribbonSkirt(spec: RibbonSpec & { skirt: number }): Triangles {
  const { right, left } = edgesOf(spec);
  const wall = (edge: { from: Spot; to: Spot }) => {
    const [x0, z0] = edge.from;
    const [x1, z1] = edge.to;
    const corners: Corner[] = [
      [x0, -spec.skirt, z0],
      [x1, -spec.skirt, z1],
      [x1, spec.top, z1],
      [x0, spec.top, z0],
    ];
    return quads({ corners, faces: [[0, 1, 2, 3]], colour: spec.colour });
  };
  return merge(
    right
      .slice(1)
      .flatMap((_, index) => [
        wall({ from: right[index], to: right[index + 1] }),
        wall({ from: left[index + 1], to: left[index] }),
      ]),
  );
}

/** The ribbon's two edges, point by point: the one on the right of the way its path runs, then the left. */
function edgesOf(spec: RibbonSpec): { right: Spot[]; left: Spot[] } {
  const { path } = spec;
  const half = spec.width / 2;
  const across = path.map((_, index): Spot => {
    const [behind, ahead] = [
      path[Math.max(0, index - 1)],
      path[Math.min(path.length - 1, index + 1)],
    ];
    const [dx, dz] = [ahead[0] - behind[0], ahead[1] - behind[1]];
    const length = Math.hypot(dx, dz);
    return [(-dz / length) * half, (dx / length) * half];
  });
  return {
    right: path.map(([x, z], index): Spot => [x + across[index][0], z + across[index][1]]),
    left: path.map(([x, z], index): Spot => [x - across[index][0], z - across[index][1]]),
  };
}

export interface FanSpec extends ArcSpec {
  readonly top: number;
  readonly colour: Rgb;
}

/** A flat wedge spread out from a point to an arc round it, facing the sky: a ball field's grass. */
export function fan(spec: FanSpec): Triangles {
  const [from, to] = [Math.min(spec.from, spec.to), Math.max(spec.from, spec.to)];
  const rim = arc({ ...spec, from, to });
  const at = ([x, z]: Spot): Corner => [x, spec.top, z];
  return triangles({
    corners: [at(spec.centre), ...rim.map(at)],
    faces: rim.slice(1).map((_, index) => [0, index + 2, index + 1] as const),
    colour: spec.colour,
  });
}

export interface FenceSpec {
  readonly path: readonly Spot[];
  readonly height: number;
  readonly colour: Rgb;
}

/** A thin wall standing along a path, seen from either side: a fence, a backstop's netting. */
export function fence(spec: FenceSpec): Triangles {
  const panels = spec.path.slice(1).map(([x1, z1], index) => {
    const [x0, z0] = spec.path[index];
    const corners: Corner[] = [
      [x0, 0, z0],
      [x1, 0, z1],
      [x1, spec.height, z1],
      [x0, spec.height, z0],
    ];
    return quads({
      corners,
      faces: [
        [0, 1, 2, 3],
        [1, 0, 3, 2],
      ],
      colour: spec.colour,
    });
  });
  return merge(panels);
}
