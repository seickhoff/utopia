import { merge, quads, triangles, type BoxSpec, type Corner, type Triangles } from "./shapes.js";

/**
 * A hip roof: sloping up from all four eaves to a ridge running east to west, the ridge shorter
 * than the house by the house's depth, as most suburban houses are roofed.
 */
export function hipRoof(spec: BoxSpec): Triangles {
  const corners = hipCorners(spec);
  return merge([
    quads({
      corners,
      faces: [
        [0, 4, 5, 1],
        [2, 5, 4, 3],
      ],
      colour: spec.colour,
    }),
    triangles({
      corners,
      faces: [
        [3, 4, 0],
        [1, 5, 2],
      ],
      colour: spec.colour,
    }),
  ]);
}

/** The eaves from the north-west round to the south-west, then the ridge's west and east ends. */
function hipCorners(spec: BoxSpec): Corner[] {
  const { base, size } = spec;
  const [west, east] = [base.x - size.x / 2, base.x + size.x / 2];
  const [north, south] = [base.z - size.z / 2, base.z + size.z / 2];
  const inset = Math.min(size.x, size.z) / 2;
  const top = base.y + size.y;
  return [
    [west, base.y, north],
    [east, base.y, north],
    [east, base.y, south],
    [west, base.y, south],
    [west + inset, top, base.z],
    [east - inset, top, base.z],
  ];
}

export interface VaultSpec extends BoxSpec {
  /** How many flat strips stand in for the curve from one eave over to the other. */
  readonly segments: number;
}

/**
 * A vaulted roof, arched from its south eaves over to its north and running east to west, closed
 * at both ends: a hangar's, a Nissen hut's.
 */
export function vaultRoof(spec: VaultSpec): Triangles {
  const corners = vaultCorners(spec);
  return merge([
    quads({ corners, faces: archFaces(spec.segments), colour: spec.colour }),
    triangles({ corners, faces: endFaces(spec.segments), colour: spec.colour }),
  ]);
}

/** The strips over the arch, each from the west end's arch across to the east end's. */
function archFaces(segments: number): (readonly [number, number, number, number])[] {
  const east = segments + 1;
  return Array.from(
    { length: segments },
    (_, step) => [step, east + step, east + step + 1, step + 1] as const,
  );
}

/** The two ends, each a fan of triangles from its middle out to its arch, facing away from the other. */
function endFaces(segments: number): (readonly [number, number, number])[] {
  const east = segments + 1;
  const [westMiddle, eastMiddle] = [2 * east, 2 * east + 1];
  return Array.from({ length: segments }, (_, step) => [
    [westMiddle, step, step + 1] as const,
    [eastMiddle, east + step + 1, east + step] as const,
  ]).flat();
}

/** The arch at the west end from south to north, the same at the east end, then each end's middle. */
function vaultCorners(spec: VaultSpec): Corner[] {
  const { base, size } = spec;
  const archAt = (x: number) =>
    Array.from({ length: spec.segments + 1 }, (_, step): Corner => {
      const angle = (step / spec.segments) * Math.PI;
      return [x, base.y + Math.sin(angle) * size.y, base.z + (Math.cos(angle) * size.z) / 2];
    });
  const [west, east] = [base.x - size.x / 2, base.x + size.x / 2];
  return [...archAt(west), ...archAt(east), [west, base.y, base.z], [east, base.y, base.z]];
}
