import type { BufferAttribute, Mesh } from "three";
import type { WorldPoint } from "../board/rom-space.js";
import { surfaceAt, type GroundReading } from "./ground-fit.js";
import type { Triangles } from "./shapes.js";

/** Somewhere a model has never been laid: no point equals it, so it is always laid afresh. */
const NOWHERE = Number.NaN;

/**
 * A model laid over the land wherever it goes, each of its corners at the height of the ground
 * beneath it, or of the water's surface out at sea: a cursor that hugs the hills it passes over.
 */
export class Drape {
  private readonly rest: Float32Array;
  /** One point, reused corner after corner, so laying the model allocates nothing. */
  private readonly under = { x: 0, z: 0 };

  constructor(
    model: Triangles,
    private readonly ground: GroundReading,
  ) {
    this.rest = Float32Array.from(model.positions);
  }

  /** Writes the model's corners, laid over the land round a point, into a buffer as long as its own. */
  layAt(lay: { centre: WorldPoint; into: Float32Array }): void {
    const { rest, under } = this;
    for (let index = 0; index < rest.length; index += 3) {
      under.x = rest[index] + lay.centre.x;
      under.z = rest[index + 2] + lay.centre.z;
      lay.into[index] = under.x;
      lay.into[index + 1] = rest[index + 1] + surfaceAt(this.ground, under);
      lay.into[index + 2] = under.z;
    }
  }
}

/** A mesh draped over the land, laid again only when it has moved. */
export class DrapedMesh {
  private laidAt = { x: NOWHERE, z: NOWHERE };

  constructor(
    readonly mesh: Mesh,
    private readonly drape: Drape,
  ) {
    mesh.frustumCulled = false;
  }

  moveTo(centre: WorldPoint): void {
    if (centre.x === this.laidAt.x && centre.z === this.laidAt.z) return;
    this.laidAt = { x: centre.x, z: centre.z };
    const corners = this.mesh.geometry.getAttribute("position") as BufferAttribute;
    this.drape.layAt({ centre, into: corners.array as Float32Array });
    corners.needsUpdate = true;
  }
}
