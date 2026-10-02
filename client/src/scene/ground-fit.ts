import type { WorldPoint } from "../board/rom-space.js";
import type { Triangles, Vec3 } from "./shapes.js";

/** What a model needs to know of the land it stands on. */
export interface GroundReading {
  heightAt(world: WorldPoint): number;
  shoreDistanceAt(world: WorldPoint): number;
}

/** Nothing is set lower than this: where a square runs into the sea, it is filled just clear of it. */
export const LANDFILL_HEIGHT = 0.035;
/**
 * How far past the shoreline, in pixels, the islands' lots and everything on them may reach: to
 * just short of the water's edge, which lies nearly a pixel out, where the beach dips under the sea.
 */
export const SHORE_REACH = -0.6;
/** The sea's surface: nothing is laid lower. */
const SEA_LEVEL = 0;
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

/** The height of what lies beneath a point: the land, or the sea's surface where that is higher. */
export function surfaceAt(ground: GroundReading, point: WorldPoint): number {
  return Math.max(SEA_LEVEL, ground.heightAt(point));
}

/** Lays a flat model over the landfill: every corner lifted by the height of the land beneath it. */
export function draped(part: Triangles, ground: GroundReading): Triangles {
  return reshaped(part, (corner) => corner.y + landAt(ground, corner));
}

/** Lays a flat model over the land itself, right down onto the beach by the water. */
export function laid(part: Triangles, ground: GroundReading): Triangles {
  return reshaped(part, (corner) => corner.y + surfaceAt(ground, corner));
}

/**
 * Stands a model level on the highest land beneath it, with the foot of every wall reaching down
 * to the ground: on a slope its downhill walls grow, and nothing is left hanging in the air.
 */
export function footed(part: Triangles, ground: GroundReading): Triangles {
  const floor = Math.max(LANDFILL_HEIGHT, ...feet(part).map((foot) => landAt(ground, foot)));
  return reshaped(part, (corner) =>
    corner.y > 0 ? corner.y + floor : surfaceAt(ground, corner) - FOOTING,
  );
}

/** Whether all of a footprint stands on land, none of it past where the land's lots end. */
export function standsAshore(site: { footprint: Footprint; ground: GroundReading }): boolean {
  const { centre, width, depth } = site.footprint;
  return FOOTPRINT_SAMPLES.every((across) =>
    FOOTPRINT_SAMPLES.every(
      (down) =>
        site.ground.shoreDistanceAt({ x: centre.x + across * width, z: centre.z + down * depth }) >=
        SHORE_REACH,
    ),
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

/** A corner of a triangle, and its colour. */
interface Point {
  readonly at: Vec3;
  readonly colour: readonly number[];
}

/**
 * The part of a flat model that lies on land, cut cleanly along the line where the land's lots
 * end, just short of the water, as the terrain's fields and lawns are.
 */
export function ashore(part: Triangles, ground: GroundReading): Triangles {
  const kept = trianglesOf(part).flatMap((triangle) => keptAshore({ triangle, ground }));
  return {
    positions: kept.flatMap((triangle) => triangle.flatMap(({ at }) => [at.x, at.y, at.z])),
    colors: kept.flatMap((triangle) => triangle.flatMap(({ colour }) => [...colour])),
  };
}

function trianglesOf(part: Triangles): Point[][] {
  return Array.from({ length: part.positions.length / 9 }, (_, triangle) =>
    [0, 1, 2].map((corner) => {
      const start = (triangle * 3 + corner) * 3;
      const [x, y, z] = part.positions.slice(start, start + 3);
      return { at: { x, y, z }, colour: part.colors.slice(start, start + 3) };
    }),
  );
}

/** What of a triangle lies on land, as triangles fanned from its first corner kept. */
function keptAshore(cut: { triangle: Point[]; ground: GroundReading }): Point[][] {
  const inland = cut.triangle.map(({ at }) => cut.ground.shoreDistanceAt(at) - SHORE_REACH);
  if (inland.every((reach) => reach >= 0)) return [cut.triangle];
  const kept = keptCorners({ corners: cut.triangle, inland });
  return kept.slice(2).map((_, index) => [kept[0], kept[index + 1], kept[index + 2]]);
}

/**
 * A triangle's corners on land, going round it, with a new corner wherever an edge crosses out
 * to sea or back: the land's side of it, still wound the same way round.
 */
function keptCorners(polygon: { corners: readonly Point[]; inland: readonly number[] }): Point[] {
  const { corners, inland } = polygon;
  return corners.flatMap((corner, index) => {
    const next = (index + 1) % corners.length;
    const here = inland[index] >= 0 ? [corner] : [];
    if (inland[index] * inland[next] >= 0) return here;
    const share = inland[index] / (inland[index] - inland[next]);
    return [...here, between({ from: corner, to: corners[next], share })];
  });
}

function between(edge: { from: Point; to: Point; share: number }): Point {
  const { from, to, share } = edge;
  const mix = (a: number, b: number) => a + (b - a) * share;
  return {
    at: { x: mix(from.at.x, to.at.x), y: mix(from.at.y, to.at.y), z: mix(from.at.z, to.at.z) },
    colour: from.colour.map((value, channel) => mix(value, to.colour[channel])),
  };
}
