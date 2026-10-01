import { sampleField, signedDistance, type Field } from "./distance-field.js";
import { MASK_WIDTH, landMask, paddedLandMask } from "./land-mask.js";
import { heightAt } from "./terrain-mesh.js";
import type { WorldPoint } from "../board/rom-space.js";

const PIXELS_PER_UNIT = 8;
const HALF_WIDTH = 10;
const HALF_DEPTH = 5.5;
/** Open sea measured round the board, in pixels, so every shore's shelf is whole. */
export const SEA_MARGIN = 96;

/** The islands' shape, measured once: how far any point is from the shore, and how high it is. */
export class Ground {
  readonly field: Field = signedDistance(landMask(), MASK_WIDTH);
  /** The same measure with SEA_MARGIN pixels of open sea all round the board. */
  readonly surroundings: Field = surroundingField();

  shoreDistanceAt(world: WorldPoint): number {
    const pixel = {
      x: (world.x + HALF_WIDTH) * PIXELS_PER_UNIT,
      y: (world.z + HALF_DEPTH) * PIXELS_PER_UNIT,
    };
    return sampleField(this.field, pixel);
  }

  heightAt(world: WorldPoint): number {
    return heightAt(this.shoreDistanceAt(world));
  }
}

function surroundingField(): Field {
  const padded = paddedLandMask(SEA_MARGIN);
  return signedDistance(padded.mask, padded.width);
}
