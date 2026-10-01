import type { WorldPoint } from "../board/rom-space.js";
import type { Triangles, Vec3 } from "./shapes.js";

/** What a model needs to know of the land it stands on. */
export interface GroundReading {
  heightAt(world: WorldPoint): number;
  shoreDistanceAt(world: WorldPoint): number;
}

/** Nothing is set lower than this: where a square runs into the sea, it is filled just clear of it. */
export const LANDFILL_HEIGHT = 0.035;
/** How far a building's walls go down into the ground, so no gap shows at its foot. */
export const FOOTING = 0.02;
/** Where to test a footprint for sea: its corners, the middles of its sides, and its centre. */
const FOOTPRINT_SAMPLES = [-0.5, 0, 0.5];

/** The ground a part covers, seen from above. */
export interface Footprint {
  readonly centre: WorldPoint;
  readonly width: number;
  readonly depth: number;
}

/** The height a model stands at over a point: the land, or the landfill where the land is sea. */
export function landAt(ground: GroundReading, point: WorldPoint): number {
  return Math.max(LANDFILL_HEIGHT, ground.heightAt(point));
}

/** Lays a flat model over the land: every corner lifted by the height of the ground beneath it. */
export function draped(part: Triangles, ground: GroundReading): Triangles {
  return reshaped(part, (corner) => corner.y + landAt(ground, corner));
}

/**
 * Stands a model level on the highest land beneath it, with the foot of every wall reaching down
 * to the ground: on a slope its downhill walls grow, and nothing is left hanging in the air.
 */
export function footed(part: Triangles, ground: GroundReading): Triangles {
  const floor = Math.max(LANDFILL_HEIGHT, ...feet(part).map((foot) => landAt(ground, foot)));
  return reshaped(part, (corner) =>
    corner.y > 0 ? corner.y + floor : landAt(ground, corner) - FOOTING,
  );
}

/** Whether any of a footprint runs down into the sea, so what stands there needs landfill. */
export function reachesWater(site: { footprint: Footprint; ground: GroundReading }): boolean {
  const { centre, width, depth } = site.footprint;
  return FOOTPRINT_SAMPLES.some((across) =>
    FOOTPRINT_SAMPLES.some(
      (down) =>
        site.ground.heightAt({ x: centre.x + across * width, z: centre.z + down * depth }) <
        LANDFILL_HEIGHT,
    ),
  );
}

/** The rectangle a part covers, seen from above. */
export function footprintOf(part: Triangles): Footprint {
  const xs = corners(part).map((corner) => corner.x);
  const zs = corners(part).map((corner) => corner.z);
  const [west, east, north, south] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...zs),
    Math.max(...zs),
  ];
  return {
    centre: { x: (west + east) / 2, z: (north + south) / 2 },
    width: east - west,
    depth: south - north,
  };
}

/** The corners a model stands on: those on its floor. */
function feet(part: Triangles): Vec3[] {
  return corners(part).filter((corner) => corner.y <= 0);
}

function corners(part: Triangles): Vec3[] {
  return Array.from({ length: part.positions.length / 3 }, (_, index) => ({
    x: part.positions[index * 3],
    y: part.positions[index * 3 + 1],
    z: part.positions[index * 3 + 2],
  }));
}

function reshaped(part: Triangles, heightOf: (corner: Vec3) => number): Triangles {
  const positions = corners(part).flatMap((corner) => [corner.x, heightOf(corner), corner.z]);
  return { positions, colors: part.colors };
}
