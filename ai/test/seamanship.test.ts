import { HARBOURS } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Fisher, StayAtAnchor } from "../src/seamanship.js";
import { aPosition } from "./support/position.js";

function keysOf(intents: readonly { key: string }[]): string[] {
  return intents.map((intent) => intent.key);
}

describe("staying at anchor", () => {
  it("leaves the fishing boat where it was launched", () => {
    const view = aPosition().withBoat("left", "fishingBoat").view("left");

    expect(new StayAtAnchor().proposals(view)).toEqual([]);
  });

  it("anchors a boat it finds itself sailing", () => {
    const [first] = new StayAtAnchor().proposals(aPosition().sailing("left").view("left"));

    expect(first.key).toMatch(/^anchor at/);
  });
});

describe("going fishing", () => {
  it("takes the fishing boat out", () => {
    const view = aPosition().withBoat("left", "fishingBoat").view("left");

    expect(keysOf(new Fisher([]).proposals(view))[0]).toBe(`take out ${HARBOURS.left.offset}`);
  });

  it("fishes while out in the fishing boat", () => {
    const view = aPosition().sailing("left").view("left");

    expect(keysOf(new Fisher([]).proposals(view))).toEqual(["fish"]);
  });

  it("anchors a PT boat it has no use for", () => {
    const view = aPosition().sailing("left", "ptBoat").view("left");

    expect(keysOf(new Fisher([]).proposals(view))[0]).toMatch(/^anchor at/);
  });

  it("moves a PT boat out of the harbour, where it would stop a fishing boat being bought", () => {
    const view = aPosition().withBoat("left", "ptBoat").view("left");

    expect(keysOf(new Fisher([]).proposals(view))).toEqual([`take out ${HARBOURS.left.offset}`]);
  });

  it("has nothing to do without a boat", () => {
    expect(new Fisher([]).proposals(aPosition().view("left"))).toEqual([]);
  });
});
