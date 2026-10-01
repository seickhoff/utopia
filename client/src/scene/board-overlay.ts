import { MeshLambertMaterial, type Mesh } from "three";
import type { WorldPoint } from "../board/rom-space.js";
import { landAt, type GroundReading } from "./ground-fit.js";

/** How far a marker floats over the land under it. */
const LIFT = 0.03;
/** A marker is drawn over everything else, clouds and hills included, so it is never cut off. */
export const OVER_EVERYTHING = 10;
/** Where a marker looks for the highest land under its square: corners and middle. */
const SQUARE_SAMPLES = [
  { x: -0.5, z: -0.5 },
  { x: 0.5, z: -0.5 },
  { x: 0, z: 0 },
  { x: -0.5, z: 0.5 },
  { x: 0.5, z: 0.5 },
];

/** Lit like the boats, but drawn last and through whatever stands in front of it. */
export function overlayMaterial(): MeshLambertMaterial {
  return new MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

/** Lays a marker a square wide level over the highest land under it, so no slope hides a side of it. */
export function layOverLand(
  marker: Mesh,
  site: { ground: GroundReading; centre: WorldPoint },
): void {
  const { ground, centre } = site;
  const highest = Math.max(
    ...SQUARE_SAMPLES.map((corner) =>
      landAt(ground, { x: centre.x + corner.x, z: centre.z + corner.z }),
    ),
  );
  marker.position.set(centre.x, highest + LIFT, centre.z);
}
