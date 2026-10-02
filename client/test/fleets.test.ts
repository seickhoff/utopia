import { describe, expect, it } from "vitest";
import {
  berthedFleetUnderWay,
  boatOf,
  fleetAtAnchor,
  fleetSize,
  fleetUnderWay,
  fleetWakePatches,
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

  it("tag every corner with its own boat's berth, so each boat can move a little on its own", () => {
    const tagged = KINDS.map((kind) => {
      const { triangles, berths } = berthedFleetUnderWay(kind, STYLE);
      const boats = new Set(
        Array.from({ length: berths.length / 3 }, (_, corner) => berths[corner * 3 + 2].toFixed(4)),
      );
      return [berths.length === triangles.positions.length, boats.size === fleetSize(kind)];
    });

    expect(tagged.flat().every(Boolean)).toBe(true);
  });

  it("lay each boat's wake on the water astern of it, tagged with its boat so it follows that boat", () => {
    const patches = KINDS.map((kind) => {
      const { positions, wake, berths } = fleetWakePatches(kind);
      const corners = positions.length / 3;
      const astern =
        Math.max(...positions.filter((_, index) => index % 3 === 0)) <
        Math.max(...xs(fleetUnderWay(kind, STYLE)));
      return [
        corners === fleetSize(kind) * 6,
        wake.length === corners * 2,
        berths.length === positions.length,
        astern,
      ];
    });

    expect(patches.flat().every(Boolean)).toBe(true);
  });

  it("measure each wake from its boat's stern: how far astern, and how far off the track", () => {
    const { wake } = fleetWakePatches("ptBoat");
    const astern = wake.filter((_, index) => index % 2 === 0);
    const abeam = wake.filter((_, index) => index % 2 === 1);

    expect([Math.min(...astern), Math.min(...abeam) === -Math.max(...abeam)]).toEqual([0, true]);
  });

  it("set a fishing boat's net out on the water while it lies at anchor", () => {
    const corners = (part: Triangles) => part.positions.length / 3;
    const moored = corners(fleetAtAnchor("fishingBoat", STYLE));
    const sailing = corners(fleetUnderWay("fishingBoat", STYLE));

    expect([moored > sailing, corners(fleetAtAnchor("ptBoat", STYLE))]).toEqual([
      true,
      corners(fleetUnderWay("ptBoat", STYLE)),
    ]);
  });
});
