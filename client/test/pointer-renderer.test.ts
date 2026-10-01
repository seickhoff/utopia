import { Mesh, Scene } from "three";
import { describe, expect, it } from "vitest";
import type { WorldPoint } from "../src/board/rom-space.js";
import type { GroundReading } from "../src/scene/ground-fit.js";
import { PointerRenderer } from "../src/scene/pointer-renderer.js";
import { SIDE_STYLES } from "../src/scene/town-layout.js";

const FLAT: GroundReading = { heightAt: () => 0, shoreDistanceAt: () => 0 };

/** Where the mouse is on the board in these tests. */
const SPOT: WorldPoint = { x: 2.5, z: -1.25 };

/** A hill standing under one corner of the square round the spot, and flat ground elsewhere. */
const HILL_HEIGHT = 0.4;
const HILLY: GroundReading = {
  heightAt: (world) => (world.x > SPOT.x && world.z > SPOT.z ? HILL_HEIGHT : 0),
  shoreDistanceAt: () => 0,
};

function aPointer(ground: GroundReading = FLAT) {
  const scene = new Scene();
  const canvas = { dataset: {} as DOMStringMap };
  const pointer = new PointerRenderer(scene, { ground, canvas });
  const crosses = () => scene.children.filter((child) => child.visible) as Mesh[];
  const systemPointer = () => canvas.dataset.pointer;
  return { pointer, crosses, systemPointer };
}

/** The colour a mesh is painted, read from its first corner. */
function colourOf(mesh: Mesh): number[] {
  return [...mesh.geometry.getAttribute("color").array.slice(0, 3)];
}

describe("PointerRenderer while the player's boat follows the mouse", () => {
  it("draws a cross where the mouse is", () => {
    const { pointer, crosses } = aPointer();

    pointer.update({ side: "left", mode: "sailing", spot: SPOT });

    const [cross] = crosses();
    expect([cross.position.x, cross.position.z]).toEqual([2.5, -1.25]);
  });

  it("draws the player's own cross alone, in their colour", () => {
    const { pointer, crosses } = aPointer();

    pointer.update({ side: "right", mode: "sailing", spot: SPOT });

    expect(crosses().map(colourOf)).toEqual([[...Float32Array.from(SIDE_STYLES.right.accent)]]);
  });

  it("hides the system pointer, the cross standing in for it", () => {
    const { pointer, systemPointer } = aPointer();

    pointer.update({ side: "left", mode: "sailing", spot: SPOT });

    expect(systemPointer()).toBe("drawn");
  });

  it("lays the cross over the highest land under it, so no hill hides it", () => {
    const { pointer, crosses } = aPointer(HILLY);

    pointer.update({ side: "left", mode: "sailing", spot: SPOT });

    const [cross] = crosses();
    expect(cross.position.y).toBeGreaterThan(HILL_HEIGHT);
  });
});

describe("PointerRenderer while the cursor follows the mouse", () => {
  it("draws no cross, the cursor being pointer enough", () => {
    const { pointer, crosses } = aPointer();

    pointer.update({ side: "left", mode: "cursor", spot: SPOT });

    expect(crosses()).toEqual([]);
  });

  it("hides the system pointer, the cursor standing in for it", () => {
    const { pointer, systemPointer } = aPointer();

    pointer.update({ side: "left", mode: "cursor", spot: SPOT });

    expect(systemPointer()).toBe("drawn");
  });
});

describe("PointerRenderer when the board does not show the mouse", () => {
  it("shows the system pointer off the board", () => {
    const { pointer, crosses, systemPointer } = aPointer();

    pointer.update({ side: "left", mode: "sailing", spot: "away" });

    expect([crosses(), systemPointer()]).toEqual([[], "system"]);
  });

  it("shows the system pointer while the boat goes down", () => {
    const { pointer, crosses, systemPointer } = aPointer();

    pointer.update({ side: "left", mode: "sinking", spot: SPOT });

    expect([crosses(), systemPointer()]).toEqual([[], "system"]);
  });

  it("puts the cross away at once when the mouse leaves, with no frame to come", () => {
    const { pointer, crosses, systemPointer } = aPointer();
    pointer.update({ side: "left", mode: "sailing", spot: SPOT });

    pointer.putAway();

    expect([crosses(), systemPointer()]).toEqual([[], "system"]);
  });
});
