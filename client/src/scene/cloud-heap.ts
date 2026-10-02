import { pseudoRandom } from "./random.js";

/** A tier of a heaped cloud: puffs scattered round its middle at one height. */
export interface Tier {
  /** How high the tier sits over the cloud's base, as a share of the cloud's radius. */
  readonly rise: number;
  /** How far out from the middle its puffs reach, as a share of the cloud's radius. */
  readonly spread: number;
  readonly count: number;
  /** Each puff's radius, as a share of the cloud's. */
  readonly size: number;
}

/** A puff of a cloud, placed from the middle of the cloud's base: x east, y up, z south. */
export interface Puff {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  /** How far up the heap it sits, 0 at the base to 1 at the top: its share of the sunlight. */
  readonly rise: number;
}

export interface HeapSpec {
  /** The cloud's radius, in squares. */
  readonly radius: number;
  readonly tiers: readonly Tier[];
  /** The cloud's own number from 0 to 1, so each heaps its own way. */
  readonly seed: number;
}

/** The angle between one puff and the next round a tier: the golden angle, so none line up. */
const GOLDEN_ANGLE = 2.399963;
/** The camera's usual tilt, in radians: it always looks from the south, so this sorts the puffs. */
const USUAL_TILT = 0.7;

/**
 * A heaped cloud as puffs piled in tiers: a broad flat base, narrowing as it climbs. The puffs
 * come far to near as the camera sees them from the south, so each is drawn over those behind.
 */
export function cloudHeap(spec: HeapSpec): Puff[] {
  const placed = [
    ...spec.tiers.flatMap((tier, level) =>
      Array.from({ length: tier.count }, (_, index) =>
        tierPuff({ spec, tier, at: level * 100 + index }),
      ),
    ),
  ];
  const top = Math.max(...placed.map((puff) => puff.y));
  const puffs = placed.map((puff) => ({ ...puff, rise: top > 0 ? puff.y / top : 0 }));
  return puffs.sort((a, b) => depthOf(a) - depthOf(b));
}

/** A puff before its share of the sunlight is known, which waits on the tallest. */
type Placed = Omit<Puff, "rise">;

function tierPuff(placing: { spec: HeapSpec; tier: Tier; at: number }): Placed {
  const { spec, tier, at } = placing;
  const random = (salt: number) => pseudoRandom(spec.seed * 997 + at * 13.1 + salt);
  const index = at % 100;
  const angle = index * GOLDEN_ANGLE + spec.seed * Math.PI * 2 + at;
  const out =
    spec.radius * tier.spread * Math.sqrt((index + 0.5) / tier.count) * (0.85 + 0.15 * random(1));
  return {
    x: Math.cos(angle) * out,
    y: spec.radius * tier.rise * (0.9 + 0.2 * random(2)),
    z: Math.sin(angle) * out,
    radius: spec.radius * tier.size * (0.85 + 0.3 * random(3)),
  };
}

/** How far off a puff lies, along the camera's line of sight from the south and above. */
function depthOf(puff: Placed): number {
  return puff.z * Math.cos(USUAL_TILT) + puff.y * Math.sin(USUAL_TILT);
}
