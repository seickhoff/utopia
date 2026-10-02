import type { WorldPoint } from "../board/rom-space.js";
import type { District } from "./districts/district.js";
import {
  ashore,
  draped,
  footed,
  footprintOf,
  laid,
  reachesWater,
  standsAshore,
  type GroundReading,
} from "./ground-fit.js";
import { landfill } from "./item-kits.js";
import { merge, placed, type Triangles } from "./shapes.js";

const EMPTY: Triangles = { positions: [], colors: [] };

export interface DistrictSite {
  readonly district: District;
  /** The middle of the square it is built on. */
  readonly centre: WorldPoint;
  readonly ground: GroundReading;
}

/**
 * A district fitted to the land of its square: its car parks, courts and streets laid over the
 * ground and cut off at the water's edge, as the terrain's lawns are, and each building stood on
 * the ground beneath it, right down to the water. Whatever would stand in the sea is left out, so
 * a district keeps to the shore; all but its landmark, which gets landfill beneath it instead.
 */
export function fittedDistrict(site: DistrictSite): Triangles {
  const { district, ground } = site;
  const offset = { x: site.centre.x, y: 0, z: site.centre.z };
  const moved = (part: Triangles) => placed(part, { offset, turn: 0 });
  const [landmark, ...others] = district.structures.map(moved);
  const standing = [landmark, ...others.filter((structure) => isAshore(structure, ground))];
  return merge([
    ...district.decals.map((decal) => laid(ashore(moved(decal), ground), ground)),
    fillBeneath(landmark, ground),
    ...standing.map((structure) => footed(structure, ground)),
  ]);
}

function isAshore(part: Triangles, ground: GroundReading): boolean {
  return standsAshore({ footprint: footprintOf(part), ground });
}

function fillBeneath(landmark: Triangles, ground: GroundReading): Triangles {
  const footprint = footprintOf(landmark);
  if (!reachesWater({ footprint, ground })) return EMPTY;
  const offset = { x: footprint.centre.x, y: 0, z: footprint.centre.z };
  return draped(placed(landfill(footprint), { offset, turn: 0 }), ground);
}
