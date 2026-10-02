import { BufferAttribute, type BufferGeometry, type Material } from "three";
import type { BerthedFleet } from "./fleets.js";
import { trianglesGeometry } from "./geometry.js";

/**
 * Each boat's own play within its fleet, in shader code added to the fleet's material: speeding
 * up and slowing down about its berth, drifting to one side and back, its head swinging into its
 * drift, and a gentle heave, all at its own pace, so a fleet keeps to its area without moving as
 * one rigid piece.
 */
export const FLEET_PLAY_GLSL = /* glsl */ `
attribute vec3 aBerth;
uniform float uPlayTime;

/**
 * A boat's play now: how far it has pulled ahead of its berth or dropped back, how far it has
 * drifted to one side, how far its head has swung (into the way it is drifting, as a boat steers
 * across), and how high it rides the swell. Never so far that it leaves its berth's room.
 */
vec4 boatPlay() {
  float t = uPlayTime + aBerth.z * 37.0;
  return vec4(
    0.03 * sin(t * 0.5) + 0.01 * sin(t * 1.3 + 1.3),
    0.022 * sin(t * 0.4 + 2.0),
    0.09 * cos(t * 0.4 + 2.0) + 0.02 * sin(t * 0.9),
    0.0022 * sin(t * 2.3));
}

vec3 turnedBy(vec3 v, float turn) {
  float c = cos(turn);
  float s = sin(turn);
  return vec3(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
}

vec3 playTurned(vec3 facing) {
  return turnedBy(facing, boatPlay().z);
}

/** A corner of a boat, swung about the boat's own middle and carried by its play. */
vec3 played(vec3 corner) {
  vec4 play = boatPlay();
  vec3 own = corner - vec3(aBerth.x, 0.0, aBerth.y);
  return turnedBy(own, play.z) + vec3(aBerth.x + play.x, play.w, aBerth.y + play.y);
}
`;

/** The time every fleet's play is taken at, set once a frame and shared by all their materials. */
export class FleetPlay {
  /** The play's time as a uniform, for a shader of its own to read as uPlayTime. */
  readonly time = { value: 0 };

  /** Teaches a fleet's material to give each of its boats its own play. */
  teach(material: Material): void {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uPlayTime = this.time;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${FLEET_PLAY_GLSL}`)
        .replace("#include <beginnormal_vertex>", "vec3 objectNormal = playTurned(normal);")
        .replace("#include <begin_vertex>", "vec3 transformed = played(position);");
    };
  }

  advance(seconds: number): void {
    this.time.value = seconds;
  }
}

/** A fleet's geometry, each corner carrying its boat's berth for the play to move it by. */
export function berthedGeometry(fleet: BerthedFleet): BufferGeometry {
  const geometry = trianglesGeometry(fleet.triangles);
  geometry.setAttribute("aBerth", new BufferAttribute(fleet.berths, 3));
  return geometry;
}
