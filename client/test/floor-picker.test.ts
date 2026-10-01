import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { FloorPicker } from "../src/scene/floor-picker.js";

const FRAME = { left: 0, top: 0, width: 800, height: 400 };
/** The height a pointer's ray is taken to meet the playfield. */
const PICKING_HEIGHT = 0.05;

/** A camera looking down at the floor at a slant, as the diorama's does. */
function aSlantedCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(40, FRAME.width / FRAME.height, 0.1, 100);
  camera.position.set(0, 5, 7);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

/** Where on the page a point of the floor shows. */
function onScreen(point: { x: number; z: number }, camera: PerspectiveCamera) {
  const shown = new Vector3(point.x, PICKING_HEIGHT, point.z).project(camera);
  return {
    clientX: ((shown.x + 1) / 2) * FRAME.width,
    clientY: ((1 - shown.y) / 2) * FRAME.height,
  };
}

const degreesOf = (way: { x: number; y: number }) => (Math.atan2(way.y, way.x) * 180) / Math.PI;

describe("FloorPicker", () => {
  it("finds the way a drag runs across the floor, the camera's slant undone", () => {
    const camera = aSlantedCamera();
    const canvas = { getBoundingClientRect: () => FRAME } as HTMLCanvasElement;
    const picker = new FloorPicker({ canvas, camera });
    const drag = {
      from: onScreen({ x: 1, z: 1 }, camera),
      to: onScreen({ x: 3, z: -1 }, camera),
    };
    const onGlass = {
      x: drag.to.clientX - drag.from.clientX,
      y: drag.to.clientY - drag.from.clientY,
    };

    const angles = [degreesOf(picker.wayAcross(drag)), degreesOf(onGlass)];

    expect([angles[0], Math.abs(angles[1] - angles[0]) > 5]).toEqual([
      expect.closeTo(-45, 6),
      true,
    ]);
  });
});
