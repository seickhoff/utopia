import { describe, expect, it } from "vitest";
import { boltShape, strikeAt, type BoltSegment } from "../src/scene/bolt-shape.js";

const FROM = { x: 1, y: 1.4, z: 2 };
const TO = { x: 1.2, y: 0.1, z: 2.1 };
const bolt = (seed = 0.42) => boltShape({ from: FROM, to: TO, seed });
const channel = (segments: readonly BoltSegment[]) => segments.filter((segment) => segment.main);

describe("boltShape", () => {
  it("runs one unbroken channel from the cloud down to the ground", () => {
    const main = channel(bolt());
    const unbroken = main.every(
      (segment, index) => index === 0 || segment.from === main[index - 1].to,
    );

    expect([main[0].from, main[main.length - 1].to, unbroken]).toEqual([FROM, TO, true]);
  });

  it("zigzags as lightning does, never running straight", () => {
    const strays = channel(bolt()).map((segment) => {
      const along = (FROM.y - segment.to.y) / (FROM.y - TO.y);
      const x = FROM.x + (TO.x - FROM.x) * along;
      const z = FROM.z + (TO.z - FROM.z) * along;
      return Math.hypot(segment.to.x - x, segment.to.z - z);
    });

    expect(Math.max(...strays)).toBeGreaterThan(0.04);
  });

  it("forks into thinner, fainter branches, each reaching on downward", () => {
    const branches = bolt().filter((segment) => !segment.main);
    const main = channel(bolt())[0];

    expect([
      branches.length > 6,
      branches.every((segment) => segment.width < main.width && segment.brightness < 1),
      branches.every((segment) => segment.to.y < segment.from.y + 0.05),
    ]).toEqual([true, true, true]);
  });

  it("orders its segments by how far down the leader reaches them", () => {
    const reaches = channel(bolt()).map((segment) => segment.reach);

    expect([
      reaches[0],
      reaches.every((reach, index) => index === 0 || reach > reaches[index - 1]),
    ]).toEqual([0, true]);
  });

  it("strikes a new shape every time", () => {
    expect(bolt(0.1)).not.toEqual(bolt(0.7));
  });
});

describe("strikeAt", () => {
  it("sends its leader down to the ground before the flash", () => {
    const leading = strikeAt(0.02);

    expect([leading.reach > 0 && leading.reach < 1, leading.brightness < 0.5]).toEqual([
      true,
      true,
    ]);
  });

  it("flashes at its brightest when the leader meets the ground", () => {
    expect([strikeAt(0.08).reach, strikeAt(0.08).brightness]).toEqual([1, 1]);
  });

  it("flickers as the channel fades and strikes again", () => {
    const glow = Array.from({ length: 50 }, (_, step) => strikeAt(0.08 + step * 0.006).brightness);
    const brightenings = glow.filter((value, index) => index > 0 && value > glow[index - 1] + 0.2);

    expect(brightenings.length).toBeGreaterThanOrEqual(1);
  });

  it("is gone within a second", () => {
    expect([strikeAt(1).brightness, strikeAt(1).over]).toEqual([0, true]);
  });
});
