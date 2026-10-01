import { Color, Vector4 } from "three";
import { FORE_REEF_RUN, REEF } from "./reef.js";
import { WATER } from "./water-look.js";

/**
 * The barrier reef in shader code: the reef itself on the sea floor (whose rise the terrain's
 * geometry already carries), the ocean darkening beyond it, and the surf breaking on its crest.
 * It works the same sums as reef.ts.
 */
export const REEF_GLSL = /* glsl */ `
uniform vec4 uReef;
uniform vec3 uOcean;

/** How far a point lies beyond the edge of the sailable sea, in squares (negative within it). */
float reefDistance(vec2 place) {
  vec2 outside = abs(place) - uReef.xy;
  float edge = length(max(outside, 0.0)) + min(max(outside.x, outside.y), 0.0);
  float wobble = 0.09 * sin(place.x * 0.83 + 1.3) * sin(place.y * 1.07 + 0.4)
    + 0.045 * sin(place.x * 2.1 + place.y * 1.7);
  return edge + wobble;
}

/** 1 on the reef's crest, falling away to 0 a little way either side of it. */
float reefCrest(float pastEdge) {
  return 1.0 - smoothstep(0.0, 0.32, abs(pastEdge - uReef.z));
}

/** 0 inside the reef, rising smoothly down the fore-reef to 1 where it meets the ocean floor. */
float beyondReef(float pastEdge) {
  return smoothstep(uReef.z + 0.3, uReef.z + uReef.w, pastEdge);
}

/** 0 inside the reef's crest, 1 a square out, down the fore-reef. */
float overReef(float pastEdge) {
  return smoothstep(uReef.z, uReef.z + 1.0, pastEdge);
}
`;

/** The uniforms REEF_GLSL reads. */
export function reefUniforms() {
  const reef = new Vector4(REEF.halfWidth, REEF.halfDepth, REEF.offset, FORE_REEF_RUN);
  return { uReef: { value: reef }, uOcean: { value: new Color(WATER.ocean) } };
}
