import { SIDES, type Side } from "../board/side.js";
import { resolveContacts } from "./contacts.js";
import { stirTheSea } from "./sea-tick.js";
import type { World } from "./world.js";

export const FRAMES_PER_SECOND = 60;
/** The EXEC moves sprites every 60 Hz frame; the cartridge's timer task runs at 20 Hz. */
export const FRAMES_PER_TICK = 3;
/** The sinking-boat animation is stepped from two places in the timer task (L_54E8). */
const WRECK_COUNTS_PER_TICK = 2;

/** One 60 Hz frame of motion, a third of what the EXEC moves each sprite in a tick. */
export function playFrame(world: World): void {
  const scale = world.rules.finePerUnitPerFrame;
  SIDES.forEach((side) => world.pilots[side].move(scale));
  world.sea.all().forEach((drifter) => drifter.move(scale));
  world.sea.clearAway();
}

/** One 20 Hz tick: the EXEC's collision dispatches, then the cartridge's timer task (TICTSK). */
export function runTick(world: World): void {
  resolveContacts(world);
  stirTheSea(world);
  world.clock.tick();
  for (let count = 0; count < WRECK_COUNTS_PER_TICK; count += 1) world.board.advanceWrecks();
  world.sea.all().forEach((drifter) => drifter.tick());
  SIDES.forEach((side) => tickPilot(world, side));
}

/** A sunk boat's governor gets the cursor back at its start (L_55E8). */
function tickPilot(world: World, side: Side): void {
  const pilot = world.pilots[side];
  pilot.tick();
  if (!pilot.hasGoneDown()) return;
  pilot.respawn();
  world.events.record({ type: "pilotRespawned", side });
}
