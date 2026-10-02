import {
  Color,
  Mesh,
  Scene,
  type InstancedBufferAttribute,
  type InstancedBufferGeometry,
} from "three";
import { describe, expect, it } from "vitest";
import { CLOUD_LOOKS } from "../src/scene/cloud-looks.js";
import { CloudPuffs } from "../src/scene/cloud-puffs.js";
import type { Vec3 } from "../src/scene/shapes.js";

/** A rain cloud's puffs shown to a camera here, and how far each lies from it, in the order drawn. */
function distancesDrawnFrom(eye: Vec3): number[] {
  const scene = new Scene();
  const puffs = new CloudPuffs(scene, { capacity: 64, order: 2 });
  const look = CLOUD_LOOKS.rain;
  puffs.begin();
  puffs.heap({
    cloud: { radius: look.radius, tiers: look.heap, seed: 0.3 },
    base: { x: 0, y: look.height, z: 0 },
    seconds: 0,
    tints: { light: new Color(), shade: new Color() },
    flash: 0,
    eye,
  });
  puffs.finish();
  const mesh = scene.children[0] as Mesh<InstancedBufferGeometry>;
  const places = (mesh.geometry.getAttribute("aPlace") as InstancedBufferAttribute).array;
  return Array.from({ length: mesh.geometry.instanceCount }, (_, index) =>
    Math.hypot(
      places[index * 4] - eye.x,
      places[index * 4 + 1] - eye.y,
      places[index * 4 + 2] - eye.z,
    ),
  );
}

const farToNear = (distances: readonly number[]) =>
  distances.every((distance, index) => index === 0 || distance <= distances[index - 1]);

describe("CloudPuffs", () => {
  it("draws a cloud's puffs far to near, each over those behind it, from the south", () => {
    expect(farToNear(distancesDrawnFrom({ x: 0, y: 12, z: 18 }))).toBe(true);
  });

  it("does the same from wherever the view is turned to look from", () => {
    const turned = [
      { x: 0, y: 12, z: -18 },
      { x: 18, y: 12, z: 0 },
      { x: -13, y: 12, z: 13 },
    ].map((eye) => farToNear(distancesDrawnFrom(eye)));

    expect(turned).toEqual([true, true, true]);
  });
});
