import type { PixelPoint } from "@utopia/engine";
import { Plane, Raycaster, Vector2, Vector3, type Camera } from "three";
import { isOnBoard, nearestOnBoard, spriteOverWorld, type WorldPoint } from "../board/rom-space.js";
import type { PointerSpot } from "./pointer-renderer.js";

export interface ScreenPosition {
  readonly clientX: number;
  readonly clientY: number;
}

/** Where a pointer's ray is taken to meet the playfield: a little above the sea. */
const PICKING_PLANE = new Plane(new Vector3(0, 1, 0), -0.05);

/**
 * What lies under a pointer in the 3D view. It keeps its own ray and vectors, as the mouse is
 * picked every frame and a frame allocates none.
 */
export class FloorPicker {
  private readonly ray = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly hit = new Vector3();

  constructor(private readonly view: { canvas: HTMLCanvasElement; camera: Camera }) {}

  /** The sprite point under a pointer, where its ray meets the playfield; "outside" off it. */
  romPointAt(position: ScreenPosition): PixelPoint | "outside" {
    const spot = this.spotAt(position);
    return spot === "away" ? "outside" : spriteOverWorld(spot);
  }

  /** The sprite point under a pointer, or at the nearest point on the sea's cards if it is past them. */
  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside" {
    const hit = this.floorAt(position);
    return hit === "sky" ? "outside" : spriteOverWorld(nearestOnBoard(hit));
  }

  /** The point of the playfield under the mouse, or "away" when it is off the playfield. */
  spotAt(mouse: ScreenPosition | "away"): PointerSpot {
    if (mouse === "away") return "away";
    const hit = this.floorAt(mouse);
    return hit === "sky" || !isOnBoard(hit) ? "away" : hit;
  }

  /** Where a pointer's ray meets the floor, or "sky" if it passes over the horizon. */
  private floorAt(position: ScreenPosition): WorldPoint | "sky" {
    const frame = this.view.canvas.getBoundingClientRect();
    this.pointer.set(
      ((position.clientX - frame.left) / frame.width) * 2 - 1,
      -((position.clientY - frame.top) / frame.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.view.camera);
    const hit = this.ray.ray.intersectPlane(PICKING_PLANE, this.hit);
    return hit ? { x: hit.x, z: hit.z } : "sky";
  }
}
