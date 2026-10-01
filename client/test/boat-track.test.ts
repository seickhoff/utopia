import { describe, expect, it } from "vitest";
import { BoatTrack } from "../src/scene/boat-track.js";

/** One ROM pixel, in the floor's units of a card. */
const PIXEL = 1 / 8;
/** A boat's way in a 60 Hz frame: 12.5 pixels a second. */
const BOAT_STEP = (12.5 / 60) * PIXEL;
const WEST = { vx: -10, vy: 0 };
const NORTH_EAST = { vx: 7, vy: -7 };
const STILL = { vx: 0, vy: 0 };

/** A track that has followed a boat sailing one way for a second. */
function aTrackSailing(velocity: { vx: number; vy: number }) {
  const track = new BoatTrack();
  const way = { x: Math.sign(velocity.vx), z: Math.sign(velocity.vy) };
  const at = { x: 0, z: 0 };
  for (let frame = 0; frame < 60; frame += 1) {
    at.x += way.x * BOAT_STEP;
    at.z += way.z * BOAT_STEP;
    track.follow({ centre: { x: at.x, z: at.z }, velocity });
  }
  return { track, at };
}

describe("BoatTrack", () => {
  it("stands where the boat is when it is first seen", () => {
    const track = new BoatTrack();

    track.follow({ centre: { x: 3, z: -2 }, velocity: STILL });

    expect([track.x(), track.z()]).toEqual([3, -2]);
  });

  it("eases a shove back from the shore over a few frames, rather than jumping", () => {
    const track = new BoatTrack();
    track.follow({ centre: { x: 0, z: 0 }, velocity: STILL });

    track.follow({ centre: { x: PIXEL, z: 0 }, velocity: STILL });

    expect(track.x()).toBeLessThan(PIXEL / 2);
  });

  it("jumps straight to a boat put back somewhere far off", () => {
    const track = new BoatTrack();
    track.follow({ centre: { x: 0, z: 0 }, velocity: STILL });

    track.follow({ centre: { x: 6, z: 2 }, velocity: STILL });

    expect([track.x(), track.z()]).toEqual([6, 2]);
  });

  it("starts afresh at a boat seen again after being out of sight", () => {
    const track = new BoatTrack();
    track.follow({ centre: { x: 0, z: 0 }, velocity: STILL });
    track.lose();

    track.follow({ centre: { x: PIXEL, z: 0 }, velocity: STILL });

    expect(track.x()).toBe(PIXEL);
  });

  it("is under way while it moves, and faces the way it goes", () => {
    const { track } = aTrackSailing(NORTH_EAST);

    expect([track.isUnderWay(), track.bearing()]).toEqual([true, Math.PI / 4]);
  });

  it("is not under way while its disc presses it against the edge of the sea", () => {
    const track = new BoatTrack();

    for (let frame = 0; frame < 60; frame += 1) {
      track.follow({ centre: { x: -10, z: 0 }, velocity: WEST });
    }

    expect(track.isUnderWay()).toBe(false);
  });

  it("faces along the edge it slides up, not into it as its disc points", () => {
    const track = new BoatTrack();

    for (let frame = 0; frame < 60; frame += 1) {
      track.follow({ centre: { x: -10, z: -frame * BOAT_STEP }, velocity: { vx: -7, vy: -7 } });
    }

    expect(track.bearing()).toBe(Math.PI / 2);
  });

  it("keeps facing the way it sailed when a sand bar shoves it back and stops it", () => {
    const { track, at } = aTrackSailing(WEST);

    for (let frame = 0; frame < 60; frame += 1) {
      track.follow({ centre: { x: at.x + PIXEL, z: at.z }, velocity: STILL });
    }

    expect([track.isUnderWay(), track.bearing()]).toEqual([false, Math.PI]);
  });
});
