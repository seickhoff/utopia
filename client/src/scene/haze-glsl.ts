import { Color, Vector2 } from "three";
import { HAZE, WATER } from "./water-look.js";

/**
 * Aerial haze in shader code: everything fades toward the pale horizon with distance, as it does
 * over a warm sea, so the far side of the view looks far. Built-in materials get the same from
 * the scene's fog.
 */
export const HAZE_GLSL = /* glsl */ `
uniform vec3 uHazeColour;
uniform vec2 uHazeRange;

/** How far into the haze a point lies: 0 close by, 1 by the horizon. */
float hazeAt(vec3 world) {
  return smoothstep(uHazeRange.x, uHazeRange.y, distance(cameraPosition, world));
}
`;

/** The uniforms HAZE_GLSL reads. */
export function hazeUniforms() {
  return {
    uHazeColour: { value: new Color(WATER.haze) },
    uHazeRange: { value: new Vector2(HAZE.near, HAZE.far) },
  };
}
