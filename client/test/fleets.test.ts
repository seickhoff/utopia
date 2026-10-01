import { describe, expect, it } from "vitest";
import {
  boatOf,
  fleetAtAnchor,
  fleetSize,
  fleetUnderWay,
  fleetWakes,
  type FleetKind,
} from "../src/scene/fleets.js";
import { rgb, type Triangles } from "../src/scene/shapes.js";

const STYLE = { accent: rgb("#43c275") };
const KINDS: readonly FleetKind[] = ["fishingBoat", "ptBoat", "pirate"];
const xs = (part: Triangles) => part.positions.filter((_, index) => index % 3 === 0);
const reach = (part: Triangles) =>
  Math.max(...xs(part).map((x, corner) => Math.hypot(x, part.positions[corner * 3 + 2])));

describe("fleets", () => {
  it("fill a square with several boats, not one big one", () => {
    expect(KINDS.map(fleetSize).every((boats) => boats >= 3)).toBe(true);
  });

  it("stay within their square however they are turned, under way or at anchor", () => {
    const sprawling = KINDS.filter(
      (kind) =>
        reach(fleetUnderWay(kind, STYLE)) > 0.48 || reach(fleetAtAnchor(kind, STYLE)) > 0.48,
    );

    expect(sprawling).toEqual([]);
  });

  it("are built to the same scale as the towns: each boat about twice as long as a bus", () => {
    const lengths = KINDS.map((kind) => {
      const along = xs(boatOf(kind, STYLE));
      return Math.max(...along) - Math.min(...along);
    });

    expect(lengths.every((length) => length > 0.1 && length < 0.18)).toBe(true);
  });

  it("leave their wakes astern, behind the way they are heading", () => {
    const aheadOfTheFleet = KINDS.filter(
      (kind) => Math.max(...xs(fleetWakes(kind))) > Math.max(...xs(fleetUnderWay(kind, STYLE))),
    );

    expect(aheadOfTheFleet).toEqual([]);
  });

  it("colour every corner", () => {
    const uncoloured = KINDS.filter((kind) => {
      const fleet = fleetUnderWay(kind, STYLE);
      return fleet.colors.length !== fleet.positions.length;
    });

    expect(uncoloured).toEqual([]);
  });
});
