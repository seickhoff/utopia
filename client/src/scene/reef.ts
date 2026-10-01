/**
 * The barrier reef round the sea the boats may sail. Its crest lies a little inside the sailable
 * sea's edge, just where a boat's hull meets it, so the surf breaking on it marks the limit.
 */
export const REEF = {
  /** Half the sailable sea's width and depth, in squares: its 20 x 11 cards. */
  halfWidth: 10,
  halfDepth: 5.5,
  /** How far past the sailable sea's edge the crest runs; a little inside it. */
  offset: -0.12,
  /** The crest lies just under the surface. */
  crestHeight: -0.03,
  /** How steeply the reef falls away into the lagoon behind it. */
  steepness: 1.1,
  /** How steeply the fore-reef falls away from the crest toward the ocean floor: one in ten. */
  grade: 0.1,
  oceanFloor: -4,
};

/** How far out, in squares, the fore-reef slopes down from the crest before it meets the ocean floor. */
export const FORE_REEF_RUN = (REEF.crestHeight - REEF.oceanFloor) / REEF.grade;

/**
 * How far a point lies beyond the edge of the sailable sea, in squares (negative within it). The
 * reef's line wanders a little, as a real reef's does. REEF_GLSL works the same sum.
 */
export function pastEdge(x: number, z: number): number {
  const across = Math.abs(x) - REEF.halfWidth;
  const down = Math.abs(z) - REEF.halfDepth;
  const edge =
    Math.hypot(Math.max(across, 0), Math.max(down, 0)) + Math.min(Math.max(across, down), 0);
  return edge + wobble(x, z);
}

function wobble(x: number, z: number): number {
  return (
    0.09 * Math.sin(x * 0.83 + 1.3) * Math.sin(z * 1.07 + 0.4) + 0.045 * Math.sin(x * 2.1 + z * 1.7)
  );
}
