import { newGame, type GameSnapshot, type IslandSnapshot } from "@utopia/engine";
import { Mesh, MeshBasicMaterial, Scene, type Material } from "three";
import { describe, expect, it } from "vitest";
import type { GroundReading } from "../src/scene/ground-fit.js";
import { MoverRenderer } from "../src/scene/mover-renderer.js";

const FLAT: GroundReading = { heightAt: () => 0, shoreDistanceAt: () => 0 };

function aStartedGame(): GameSnapshot {
  const game = newGame({
    options: { rounds: 1, roundSeconds: 30 },
    seed: 3,
    events: { record: () => {} },
  });
  game.start();
  return game.snapshot();
}

/** An island whose governor has taken out a fishing boat and is steering it. */
function sailing(island: IslandSnapshot): IslandSnapshot {
  return { ...island, pilot: { ...island.pilot, mode: "sailing", aboard: "fishingBoat" } };
}

/** Both governors at sea, so neither cursor shows. */
function bothSailing(snapshot: GameSnapshot): GameSnapshot {
  const { left, right } = snapshot.islands;
  return { ...snapshot, islands: { left: sailing(left), right: sailing(right) } };
}

/** The marks drawn over everything that show: the cursors, or the rings round steered boats. */
function overlayMarks(snapshot: GameSnapshot): Material[] {
  const scene = new Scene();
  new MoverRenderer(scene, FLAT).update(snapshot);
  return scene.children
    .filter((child): child is Mesh => child instanceof Mesh && child.visible)
    .map((mesh) => mesh.material as Material)
    .filter((material) => !material.depthTest);
}

const opacities = (snapshot: GameSnapshot) =>
  overlayMarks(snapshot).map((material) => material.opacity);

describe("MoverRenderer", () => {
  it("lets more than half the sea show through the ring round a steered boat", () => {
    expect(opacities(bothSailing(aStartedGame()))).toEqual([0.4, 0.4]);
  });

  it("draws the ring unlit, so it shows as one even band of colour", () => {
    const rings = overlayMarks(bothSailing(aStartedGame()));

    expect(rings.every((material) => material instanceof MeshBasicMaterial)).toBe(true);
  });

  it("keeps the cursor solid", () => {
    expect(opacities(aStartedGame())).toEqual([1, 1]);
  });
});
