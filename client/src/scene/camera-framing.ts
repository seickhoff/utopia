/** How the diorama is looked at: from the south, tilted down at the islands. */
export interface CameraPose {
  readonly fovDegrees: number;
  readonly pitchDegrees: number;
  /** The point looked at, on the sea's surface. */
  readonly target: Point3;
}

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Framing {
  readonly aspect: number;
  /** The corners of what must be in view: the board, a little beyond, and the tallest hills. */
  readonly corners: readonly Point3[];
  /** How much of the view's edge to leave clear, as a fraction of half the view. */
  readonly margin: number;
}

/** Tilted well over, as if from a plane on its approach: the horizon stays just out of sight. */
export const DIORAMA_POSE: CameraPose = {
  fovDegrees: 32,
  pitchDegrees: 40,
  target: { x: 0, y: 0, z: 0.2 },
};

/** Where the camera looks, and how far back along its line of sight it stands. */
export interface Shot {
  readonly target: Point3;
  readonly distance: number;
}

/** Re-aiming converges fast: a few passes centre the view to well within a pixel. */
const CENTRING_PASSES = 6;

/**
 * The nearest shot that keeps every corner in view, aimed so they sit centred on the screen top
 * to bottom: a tilted view sees the near side of the board larger than the far, so looking at
 * the board's middle would leave more room above it than below.
 */
export function frameShot(pose: CameraPose, framing: Framing): Shot {
  let shot: Shot = { target: pose.target, distance: framingDistance(pose, framing) };
  for (let pass = 0; pass < CENTRING_PASSES; pass += 1) {
    shot = recentred({ pose: { ...pose, target: shot.target }, framing, distance: shot.distance });
  }
  return shot;
}

function recentred(aim: { pose: CameraPose; framing: Framing; distance: number }): Shot {
  const { pose, framing, distance } = aim;
  const ys = framing.corners.map(
    (corner) => project(pose, { corner, distance, aspect: framing.aspect }).y,
  );
  const offCentre = (Math.max(...ys) + Math.min(...ys)) / 2;
  const halfHeight = Math.tan((pose.fovDegrees * Math.PI) / 360) * distance;
  const pitch = (pose.pitchDegrees * Math.PI) / 180;
  const target = { ...pose.target, z: pose.target.z - (offCentre * halfHeight) / Math.sin(pitch) };
  return { target, distance: framingDistance({ ...pose, target }, framing) };
}

const NEAREST = 2;
const FARTHEST = 200;
const SEARCH_STEPS = 40;

/** Where the camera stands, this far from the target along the pose's line of sight. */
export function cameraPosition(pose: CameraPose, distance: number): Point3 {
  const pitch = (pose.pitchDegrees * Math.PI) / 180;
  const { target } = pose;
  return {
    x: target.x,
    y: target.y + distance * Math.sin(pitch),
    z: target.z + distance * Math.cos(pitch),
  };
}

/** The nearest distance from which every corner is in view, however wide or tall the screen. */
export function framingDistance(pose: CameraPose, framing: Framing): number {
  let near = NEAREST;
  let far = FARTHEST;
  for (let step = 0; step < SEARCH_STEPS; step += 1) {
    const middle = (near + far) / 2;
    if (allInView(pose, { framing, distance: middle })) far = middle;
    else near = middle;
  }
  return far;
}

interface Placement {
  readonly framing: Framing;
  readonly distance: number;
}

function allInView(pose: CameraPose, placement: Placement): boolean {
  const limit = 1 - placement.framing.margin;
  return placement.framing.corners.every((corner) => {
    const seen = project(pose, {
      corner,
      distance: placement.distance,
      aspect: placement.framing.aspect,
    });
    return seen.depth > 0 && Math.abs(seen.x) <= limit && Math.abs(seen.y) <= limit;
  });
}

interface Viewing {
  readonly corner: Point3;
  readonly distance: number;
  readonly aspect: number;
}

/** A point's place on the screen, -1 to 1 each way, and its depth in front of the camera. */
export function project(
  pose: CameraPose,
  viewing: Viewing,
): { x: number; y: number; depth: number } {
  const eye = cameraPosition(pose, viewing.distance);
  const pitch = (pose.pitchDegrees * Math.PI) / 180;
  const forward = { x: 0, y: -Math.sin(pitch), z: -Math.cos(pitch) };
  const up = { x: 0, y: Math.cos(pitch), z: -Math.sin(pitch) };
  const offset = {
    x: viewing.corner.x - eye.x,
    y: viewing.corner.y - eye.y,
    z: viewing.corner.z - eye.z,
  };
  const depth = dot(offset, forward);
  const halfHeight = Math.tan((pose.fovDegrees * Math.PI) / 360) * depth;
  return { x: offset.x / (halfHeight * viewing.aspect), y: dot(offset, up) / halfHeight, depth };
}

function dot(a: Point3, b: Point3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
