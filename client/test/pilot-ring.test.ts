import { describe, expect, it } from "vitest";
import { pilotRing } from "../src/scene/pilot-ring.js";
import { rgb } from "../src/scene/shapes.js";

const STYLE = { accent: rgb("#43c275") };

/** How far each corner of the ring lies from its middle, seen from above. */
function distances(): number[] {
  const { positions } = pilotRing(STYLE);
  const out: number[] = [];
  for (let index = 0; index < positions.length; index += 3) {
    out.push(Math.hypot(positions[index], positions[index + 2]));
  }
  return out;
}

describe("pilotRing", () => {
  it("rings the steered boat in its governor's colour", () => {
    const { colors } = pilotRing(STYLE);
    const triples = new Set(
      Array.from({ length: colors.length / 3 }, (_, at) => colors.slice(at * 3, at * 3 + 3).join()),
    );

    expect([...triples]).toEqual([STYLE.accent.join()]);
  });

  it("keeps clear of the boat, which fills no more than half a square from its middle", () => {
    expect(Math.min(...distances())).toBeGreaterThan(0.5);
  });

  it("stays within the squares round the boat", () => {
    expect(Math.max(...distances())).toBeLessThan(1);
  });

  it("lies flat on the water, one band with no sides to catch the light", () => {
    const heights = pilotRing(STYLE).positions.filter((_, index) => index % 3 === 1);

    expect(new Set(heights)).toEqual(new Set([0]));
  });

  it("faces up, so it is seen from above", () => {
    expect(upwardNormals().every((up) => up > 0)).toBe(true);
  });
});

/** How far each triangle's face turns up, by the cross product of two of its edges. */
function upwardNormals(): number[] {
  const { positions } = pilotRing(STYLE);
  const ups: number[] = [];
  for (let at = 0; at < positions.length; at += 9) {
    const [ax, , az, bx, , bz, cx, , cz] = positions.slice(at, at + 9);
    ups.push((bz - az) * (cx - ax) - (bx - ax) * (cz - az));
  }
  return ups;
}
