import { pseudoRandom } from "./random.js";

/** How many fish swim in a school: twice the twenty-four it first had. */
export const FISH_PER_SCHOOL = 48;

/** A fish as plain lists: its corners, three numbers each, and how silver each corner is. */
export interface FishModel {
  readonly positions: readonly number[];
  /** 0 along its dark back, 1 on its silver flanks and its fins. */
  readonly shine: readonly number[];
}

/** The body seen from above: its nose, its flanks at their widest, its tail's root; and the ridge of its back. */
const NOSE: readonly [number, number, number] = [0.5, 0, 0];
const FLANKS: readonly [number, number, number][] = [
  [0.08, 0, 0.13],
  [0.08, 0, -0.13],
];
const TAIL_ROOT: readonly [number, number, number] = [-0.3, 0, 0];
const RIDGE: readonly [number, number, number] = [0.05, 0.05, 0];
/** The tail fin, forked: its root and its two tips. */
const TAIL_TIPS: readonly [number, number, number][] = [
  [-0.5, 0.01, 0.14],
  [-0.5, 0.01, -0.14],
];

/**
 * A fish a unit long, its nose ahead (+x), from above: a body tapering from its nose to its tail,
 * its back ridged and dark, its flanks silver, and a forked tail fin behind.
 */
export function fishModel(): FishModel {
  const [starboard, port] = FLANKS;
  const triangles = [
    [NOSE, starboard, RIDGE],
    [NOSE, RIDGE, port],
    [starboard, TAIL_ROOT, RIDGE],
    [RIDGE, TAIL_ROOT, port],
    [TAIL_ROOT, TAIL_TIPS[0], TAIL_TIPS[1]],
  ];
  const corners = triangles.flat();
  return {
    positions: corners.flat(),
    shine: corners.map((corner) => (corner === RIDGE ? 0 : 1)),
  };
}

/**
 * Every fish of every school: four numbers a fish, its school, its own number from 0 to 1, how
 * deep it swims (0 just under the surface, 1 deepest), and how big it is. Made once; the schools
 * are moved by their places alone.
 */
export function schoolsOfFish(schools: number): Float32Array {
  const fish = new Float32Array(schools * FISH_PER_SCHOOL * 4);
  for (let index = 0; index < schools * FISH_PER_SCHOOL; index += 1) {
    const school = Math.floor(index / FISH_PER_SCHOOL);
    const depth = 1 - (index % FISH_PER_SCHOOL) / (FISH_PER_SCHOOL - 1);
    fish.set(
      [school, (index + 0.5) / (schools * FISH_PER_SCHOOL), depth, 0.8 + 0.4 * pseudoRandom(index)],
      index * 4,
    );
  }
  return fish;
}
