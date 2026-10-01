import { describe, expect, it } from "vitest";
import { Square } from "../src/geometry/square.js";
import { runTick } from "../src/game/frame-step.js";
import { stirTheSea } from "../src/game/sea-tick.js";
import { countsOf } from "../src/game/world.js";
import { LoadedDice } from "./support/loaded-dice.js";
import { aWorld, launchOver, repeat, sailOver } from "./support/world-builder.js";

describe("the sea each tick", () => {
  it("forms weather at the top left on a 0 in 100, heading south-east", () => {
    const { world, events } = aWorld({ sea: new LoadedDice().next(100, 0).next(12, 5) });

    stirTheSea(world);

    const [rain] = world.sea.inGroup("weather");
    expect([rain.kind, rain.point(), rain.velocity(), events.ofType("weatherFormed")]).toEqual([
      "rain",
      { x: 27, y: 0 },
      { x: 4, y: 5 },
      [{ type: "weatherFormed", kind: "rain" }],
    ]);
  });

  it("forms a hurricane on a 0 in 12", () => {
    const { world } = aWorld({ sea: new LoadedDice().next(100, 0).next(12, 0) });

    stirTheSea(world);

    expect(world.sea.inGroup("weather")[0].kind).toBe("hurricane");
  });

  it("holds no more than two weather systems", () => {
    const { world } = aWorld({ sea: new LoadedDice().next(100, 0).next(100, 99).next(100, 0) });
    launchOver(world, { kind: "rain", over: Square.at(0, 5) });
    launchOver(world, { kind: "storm", over: Square.at(0, 9) });

    stirTheSea(world);

    expect(world.sea.inGroup("weather")).toHaveLength(2);
  });

  it("brings a school of fish in from a corner on a 0 in 20", () => {
    const { world } = aWorld({
      sea: new LoadedDice().next(20, 0).next(8, 2).next(2, 1).next(2, 1),
    });

    stirTheSea(world);

    const [school] = world.sea.inGroup("fish");
    expect([school.point(), school.velocity()]).toEqual([
      { x: 167, y: 10 },
      { x: -3, y: 0 },
    ]);
  });

  it("brings pirates in from a corner on a 0 in 100", () => {
    const { world } = aWorld({ sea: new LoadedDice().next(100, 99).next(100, 0) });

    stirTheSea(world);

    expect(world.sea.inGroup("pirates")).toHaveLength(1);
  });

  it("nudges a drifter's course on a 0 in 10", () => {
    const { world } = aWorld({ sea: new LoadedDice().next(10, 0).next(4, 1) });
    launchOver(world, { kind: "storm", over: Square.at(0, 5), velocity: { x: 4, y: 5 } });

    stirTheSea(world);

    expect(world.sea.inGroup("weather")[0].velocity()).toEqual({ x: 4, y: 6 });
  });
});

describe("a boat under way that sinks", () => {
  const sunk = () => {
    const test = aWorld();
    sailOver(test.world, { side: "left", boat: "fishingBoat", over: Square.at(9, 9) });
    test.world.pilots.left.sink();
    return test;
  };

  it("still counts as a fishing boat while it goes down", () => {
    const { world } = sunk();
    repeat(40, () => runTick(world));

    expect(countsOf(world, "left").count("fishingBoat")).toBe(1);
  });

  it("gives its governor the cursor back, at the start, once it has gone down", () => {
    const { world, events } = sunk();

    repeat(43, () => runTick(world));

    expect([
      world.pilots.left.mode().name,
      world.pilots.left.point(),
      events.ofType("pilotRespawned"),
    ]).toEqual(["cursor", { x: 42, y: 78 }, [{ type: "pilotRespawned", side: "left" }]]);
  });
});
