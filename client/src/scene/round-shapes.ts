import type { Rgb, Triangles, Vec3 } from "./shapes.js";

export interface RoundSpec {
  /** The middle of its floor. */
  readonly base: Vec3;
  readonly radius: number;
  readonly height: number;
  /** How many flat sides stand in for its curve. */
  readonly sides: number;
  readonly colour: Rgb;
}

type Point = readonly [number, number, number];

/** An upright cylinder with a flat top: a tank, a silo, a smokestack. */
export function cylinder(spec: RoundSpec): Triangles {
  const top = spec.base.y + spec.height;
  const rim = rimOf(spec);
  const walls = rim.flatMap((_, index): Point[] => {
    const [a, b] = [rim[index], rim[(index + 1) % rim.length]];
    return [
      [a[0], spec.base.y, a[2]],
      [b[0], spec.base.y, b[2]],
      [b[0], top, b[2]],
      [a[0], spec.base.y, a[2]],
      [b[0], top, b[2]],
      [a[0], top, a[2]],
    ];
  });
  return solid([...walls, ...fan({ rim, y: top, centre: spec.base })], spec.colour);
}

/** A flat round disc facing the sky: a helipad, a roundabout. */
export function disc(spec: Omit<RoundSpec, "height">): Triangles {
  return solid(fan({ rim: rimOf(spec), y: spec.base.y, centre: spec.base }), spec.colour);
}

/** Points round the rim, turning anticlockwise as seen from above. */
function rimOf(spec: Omit<RoundSpec, "height">): Point[] {
  return Array.from({ length: spec.sides }, (_, index) => {
    const angle = -(index / spec.sides) * Math.PI * 2;
    return [
      spec.base.x + Math.cos(angle) * spec.radius,
      spec.base.y,
      spec.base.z + Math.sin(angle) * spec.radius,
    ];
  });
}

/** Triangles from the middle out to each pair of rim points, facing up. */
function fan(round: { rim: readonly Point[]; y: number; centre: Vec3 }): Point[] {
  const { rim, y, centre } = round;
  return rim.flatMap((point, index): Point[] => {
    const next = rim[(index + 1) % rim.length];
    return [
      [centre.x, y, centre.z],
      [point[0], y, point[2]],
      [next[0], y, next[2]],
    ];
  });
}

function solid(corners: readonly Point[], colour: Rgb): Triangles {
  return { positions: corners.flat(), colors: corners.flatMap(() => [...colour]) };
}
