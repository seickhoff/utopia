import { sampleField, type Field } from "./distance-field.js";
import { FORE_REEF_RUN, REEF, pastEdge } from "./reef.js";

/** A mesh as plain arrays, ready to hand to the GPU. */
export interface MeshArrays {
  readonly positions: Float32Array;
  /**
   * Two numbers a vertex: its distance from the shore in pixels (positive on land, negative at
   * sea), and the depth of the water over it (0 on land). The sea floor and the islands' own mesh
   * agree on both wherever they meet, so the water's colour runs on without a seam.
   */
  readonly shores: Float32Array;
  readonly indices: Uint32Array;
}

/** Where a grid lies over the field: how many pixels a grid step is, and the field's margin. */
export interface GridPlan {
  readonly field: Field;
  readonly step: number;
  readonly pad: number;
}

const PIXELS_PER_UNIT = 8;
const HALF_WIDTH = 10;
const HALF_DEPTH = 5.5;
/** Water this far from any land is seabed alone; the land mesh stops here. */
const NEAR_LAND = -3;
const BEACH_WIDTH = 2;
const HILL_START = 2;
const HILL_TOP = 18;
const HILL_HEIGHT = 0.35;
/**
 * The sea floor, as round the Bahamas: a shallow bank shelving gently away from the shore, then
 * falling away faster past its edge down to the ocean floor, too deep for any light to come back
 * from, so the turquoise fades softly into the open sea's blue.
 */
const SHELF = { bank: 0.034, edge: 24, dropOff: 0.05, floor: -4 };
const SEABED_BELOW_LAND = 0.05;

/**
 * The height of the land this many pixels from the shore: the sea floor shelving away, a flat
 * beach, then rolling up into hills. The sea's surface is at 0.
 */
export function heightAt(distance: number): number {
  if (distance < 0) return Math.max(SHELF.floor, shelfHeight(distance));
  if (distance < BEACH_WIDTH) return 0.03 + distance * 0.02;
  return 0.07 + HILL_HEIGHT * smoothstep((distance - HILL_START) / (HILL_TOP - HILL_START));
}

function shelfHeight(distance: number): number {
  const bank = distance * SHELF.bank + 0.03;
  const beyondEdge = Math.min(0, distance + SHELF.edge);
  return bank + beyondEdge * SHELF.dropOff;
}

/**
 * The height of the sea floor at a point: the islands and the shelf round them, the barrier reef
 * rising to just under the surface round the sailable sea, and beyond it the fore-reef sloping
 * down at one in ten, the same on every side, to the ocean floor.
 */
export function seaFloorHeight(place: { distance: number; x: number; z: number }): number {
  const shelf = heightAt(place.distance);
  if (shelf >= 0) return shelf;
  const fromCrest = pastEdge(place.x, place.z) - REEF.offset;
  if (fromCrest > 0) return foreReef(fromCrest);
  return Math.max(shelf, REEF.crestHeight - REEF.steepness * fromCrest * fromCrest);
}

/** The ocean side of the reef: falling away from the crest at a steady grade to the ocean floor. */
function foreReef(fromCrest: number): number {
  return Math.max(REEF.oceanFloor, REEF.crestHeight - REEF.grade * fromCrest);
}

/** The islands at one vertex a pixel, only where land is near. */
export function terrainMesh(field: Field): MeshArrays {
  return gridMesh({ field, step: 1, pad: 0 }, { keep: NEAR_LAND, sink: 0 });
}

/** The whole sea floor round the islands, coarser, lying just under the land's own edge. */
export function seabedMesh(plan: GridPlan): MeshArrays {
  return gridMesh(plan, { keep: -Infinity, sink: SEABED_BELOW_LAND });
}

interface Trim {
  /** Quads farther out to sea than this (pixels) are left out. */
  readonly keep: number;
  /** How far below the land's height the grid lies. */
  readonly sink: number;
}

function gridMesh(plan: GridPlan, trim: Trim): MeshArrays {
  const columns = Math.floor(plan.field.width / plan.step) + 1;
  const rows = Math.floor(plan.field.height / plan.step) + 1;
  const distances = cornerDistances({ plan, columns, rows });
  const arrays = emptyArrays(columns * rows);
  distances.forEach((distance, index) => {
    const x = ((index % columns) * plan.step - plan.pad) / PIXELS_PER_UNIT - HALF_WIDTH;
    const z = (Math.floor(index / columns) * plan.step - plan.pad) / PIXELS_PER_UNIT - HALF_DEPTH;
    const floor = seaFloorHeight({ distance, x, z });
    arrays.positions.set([x, floor - trim.sink, z], index * 3);
    arrays.shores.set([distance, Math.max(0, -floor)], index * 2);
  });
  const nearEnough = (quad: readonly number[]) =>
    Math.max(...quad.map((index) => distances[index])) >= trim.keep;
  return { ...arrays, indices: quadIndices({ columns, rows }, nearEnough) };
}

interface GridSize {
  readonly columns: number;
  readonly rows: number;
}

/** The fore-reef's long slope is near enough flat for a vertex every two squares. */
const RING_STEP = 2;
/** The ring lies deeper under the sea floor than the seabed does, so the seabed shows over it. */
const RING_SINK = 0.1;
/** Out past the seabed, every island's shelf has long since reached the ocean floor (pixels). */
const OPEN_SEA = -200;

interface Ring extends GridSize {
  /** Half the seabed's width and depth, less a step: quads wholly within it are left out. */
  readonly hole: { readonly x: number; readonly z: number };
}

/**
 * The fore-reef's long slope on past the seabed's edge, down to the ocean floor on every side: a
 * coarse ring round the seabed (whose margin of sea round the board is `seabedPad` pixels),
 * tucked a step under its edge.
 */
export function foreReefMesh(seabedPad: number): MeshArrays {
  const ring = ringLayout(seabedPad);
  const inHole = (index: number) => {
    const { x, z } = ringPlace(ring, index);
    return Math.abs(x) < ring.hole.x && Math.abs(z) < ring.hole.z;
  };
  return { ...ringVertices(ring), indices: quadIndices(ring, (quad) => !quad.every(inHole)) };
}

function ringLayout(seabedPad: number): Ring {
  const tuck = seabedPad / PIXELS_PER_UNIT - RING_STEP;
  return {
    columns: 2 * stepsOut(HALF_WIDTH) + 1,
    rows: 2 * stepsOut(HALF_DEPTH) + 1,
    hole: { x: HALF_WIDTH + tuck, z: HALF_DEPTH + tuck },
  };
}

/** Steps from the middle of the board to a step past where the fore-reef meets the ocean floor. */
function stepsOut(half: number): number {
  return Math.ceil((half + FORE_REEF_RUN) / RING_STEP) + 1;
}

/** Where a vertex of the ring lies, in squares: the grid is centred on the board. */
function ringPlace(ring: Ring, index: number): { x: number; z: number } {
  return {
    x: ((index % ring.columns) - (ring.columns - 1) / 2) * RING_STEP,
    z: (Math.floor(index / ring.columns) - (ring.rows - 1) / 2) * RING_STEP,
  };
}

function ringVertices(ring: Ring) {
  const arrays = emptyArrays(ring.columns * ring.rows);
  for (let index = 0; index < ring.columns * ring.rows; index += 1) {
    const place = ringPlace(ring, index);
    const floor = seaFloorHeight({ distance: OPEN_SEA, ...place });
    arrays.positions.set([place.x, floor - RING_SINK, place.z], index * 3);
    arrays.shores.set([OPEN_SEA, Math.max(0, -floor)], index * 2);
  }
  return arrays;
}

function emptyArrays(vertices: number) {
  return {
    positions: new Float32Array(vertices * 3),
    shores: new Float32Array(vertices * 2),
  };
}

function cornerDistances(grid: { plan: GridPlan; columns: number; rows: number }): Float32Array {
  const { plan, columns, rows } = grid;
  const distances = new Float32Array(columns * rows);
  for (let index = 0; index < distances.length; index += 1) {
    const x = (index % columns) * plan.step;
    const y = Math.floor(index / columns) * plan.step;
    distances[index] = sampleField(plan.field, { x, y });
  }
  return distances;
}

/** The grid's quads as pairs of triangles, leaving out any whose corners `kept` turns down. */
function quadIndices(grid: GridSize, kept: (corners: readonly number[]) => boolean): Uint32Array {
  const indices: number[] = [];
  for (let row = 0; row < grid.rows - 1; row += 1) {
    for (let col = 0; col < grid.columns - 1; col += 1) {
      const corner = row * grid.columns + col;
      const quad = [corner, corner + 1, corner + grid.columns, corner + grid.columns + 1];
      if (!kept(quad)) continue;
      indices.push(quad[0], quad[2], quad[1], quad[1], quad[2], quad[3]);
    }
  }
  return Uint32Array.from(indices);
}

function smoothstep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}
