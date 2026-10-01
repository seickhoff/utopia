import { Mesh, type Scene, type Texture } from "three";
import type { ShadowSpots } from "./cloud-shadows.js";
import { indexedGeometry } from "./geometry.js";
import { SEA_MARGIN, type Ground } from "./ground.js";
import { terrainMaterial } from "./terrain-material.js";
import { foreReefMesh, seabedMesh, terrainMesh } from "./terrain-mesh.js";

/** The sea floor far from land changes slowly, so it needs a vertex only every few pixels. */
const SEABED_STEP = 4;
/**
 * The fore-reef's ring is drawn after the seabed it lies under, so the depth test turns away the
 * hidden part of it before any of it is shaded.
 */
const AFTER_THE_SEABED = 1;

export interface IslandSetting {
  readonly ground: Ground;
  readonly shadows: ShadowSpots;
  /** What covers each square's land, one texel a square: the terrain paints it there. */
  readonly landUse: Texture;
}

/**
 * The two islands and the sea floor round them, shaped once from the cartridge's coastlines: fine
 * where land is near, coarser out to sea, coarsest down the fore-reef's long slope, all painted
 * with the same tiles.
 */
export function addIslands(scene: Scene, setting: IslandSetting): void {
  const { ground, shadows, landUse } = setting;
  const material = terrainMaterial({ shadows, landUse });
  const seabed = seabedMesh({ field: ground.surroundings, step: SEABED_STEP, pad: SEA_MARGIN });
  const foreReef = new Mesh(indexedGeometry(foreReefMesh(SEA_MARGIN)), material);
  foreReef.renderOrder = AFTER_THE_SEABED;
  scene.add(new Mesh(indexedGeometry(terrainMesh(ground.field)), material));
  scene.add(new Mesh(indexedGeometry(seabed), material));
  scene.add(foreReef);
}
