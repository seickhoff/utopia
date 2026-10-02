import { describe, expect, it } from "vitest";
import { cloudHeap, type Puff } from "../src/scene/cloud-heap.js";
import { CLOUD_LOOKS } from "../src/scene/cloud-looks.js";

const heapOf = (kind: "rain" | "storm", seed = 0.37) => {
  const look = CLOUD_LOOKS[kind];
  return cloudHeap({ radius: look.radius, tiers: look.heap, seed });
};
const tops = (puffs: readonly Puff[]) => Math.max(...puffs.map((puff) => puff.y));

describe("cloudHeap", () => {
  it("piles a cloud up from puffs, from a flat base to a heaped top", () => {
    const puffs = heapOf("rain");

    expect([
      puffs.length >= 24,
      Math.min(...puffs.map((puff) => puff.y)),
      tops(puffs) > 0.5,
    ]).toEqual([true, 0, true]);
  });

  it("heaps a thunderstorm as big as a rain cloud, as the cartridge draws both from one picture", () => {
    const [rain, storm] = [CLOUD_LOOKS.rain, CLOUD_LOOKS.storm];

    expect([
      storm.radius === rain.radius,
      storm.height === rain.height,
      Math.max(...storm.heap.map((tier) => tier.rise)) ===
        Math.max(...rain.heap.map((tier) => tier.rise)),
    ]).toEqual([true, true, true]);
  });

  it("keeps every puff within the cloud's width", () => {
    const look = CLOUD_LOOKS.storm;
    const sprawling = heapOf("storm").filter(
      (puff) => Math.hypot(puff.x, puff.z) + puff.radius > look.radius * 1.1,
    );

    expect(sprawling).toEqual([]);
  });

  it("lights its puffs more the higher they sit, its base in shadow", () => {
    const puffs = heapOf("rain");
    const base = puffs.filter((puff) => puff.y === 0);

    expect([base.every((puff) => puff.rise === 0), Math.max(...puffs.map((p) => p.rise))]).toEqual([
      true,
      1,
    ]);
  });

  it("orders its puffs far to near, as the camera looks from the south, each drawn over those behind", () => {
    const depths = heapOf("storm").map((puff) => puff.z * Math.cos(0.7) + puff.y * Math.sin(0.7));

    expect(depths.every((depth, index) => index === 0 || depth >= depths[index - 1])).toBe(true);
  });

  it("heaps each cloud its own way", () => {
    expect(heapOf("rain", 0.1)).not.toEqual(heapOf("rain", 0.6));
  });
});
