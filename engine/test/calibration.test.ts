import { describe, expect, it } from "vitest";
import { PixelPoint } from "../src/geometry/pixel-point.js";
import { Square } from "../src/geometry/square.js";
import { FRAMES_PER_SECOND, FRAMES_PER_TICK, playFrame, runTick } from "../src/game/frame-step.js";
import type { World } from "../src/game/world.js";
import { aWorld, repeat } from "./support/world-builder.js";

/**
 * The console ROM's scale for sprite speeds is not in the cartridge. The EXEC moves sprites and
 * dispatches their collisions once a 20 Hz tick; these pin the resulting pace, so a change shows.
 */
describe("the pace of the sea", () => {
  it("earns a gold bar for each 2.5 seconds a boat sits over fish (50 catches at 20 a second)", () => {
    const { world } = aWorld();
    world.board.anchor(Square.at(9, 9), { side: "left", boat: "fishingBoat" });
    world.sea.launch("fish", {
      kind: "fish",
      at: new PixelPoint(80, 80),
      velocity: { x: 0, y: 0 },
    });

    playSeconds(world, 10);

    expect(world.islands.left.standing().goldThisRound).toBe(4);
  });

  it("rains a gold bar or two onto a crop a cloud passes squarely over, as the manual says", () => {
    const { world } = aWorld();
    const crop = Square.at(5, 3);
    world.board.build(crop, "crop");
    const start = new PixelPoint(crop.col * 8 + 8 - 16, crop.row * 8 + 8 - 20);
    world.sea.launch("weather", { kind: "rain", at: start, velocity: { x: 4, y: 5 } });

    playSeconds(world, 30);

    expect([1, 2]).toContain(world.islands.left.standing().goldThisRound);
  });

  it("carries the cursor across the sea in about eight seconds", () => {
    const { world } = aWorld();
    world.pilots.left.lay(new PixelPoint(8, 40));
    world.pilots.left.pressDisc(4);

    repeat(8 * FRAMES_PER_SECOND, () => playFrame(world));

    expect(world.pilots.left.point().x).toBe(158);
  });
});

function playSeconds(world: World, seconds: number): void {
  repeat((seconds * FRAMES_PER_SECOND) / FRAMES_PER_TICK, () => {
    repeat(FRAMES_PER_TICK, () => playFrame(world));
    runTick(world);
  });
}
