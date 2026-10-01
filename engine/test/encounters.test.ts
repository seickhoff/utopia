import { describe, expect, it } from "vitest";
import { HARBOURS } from "../src/board/island-map.js";
import { Square } from "../src/geometry/square.js";
import { resolveContacts } from "../src/game/contacts.js";
import { LoadedDice } from "./support/loaded-dice.js";
import { aWorld, launchOver, repeat, sailOver } from "./support/world-builder.js";

const LAND = Square.at(3, 2);
const OTHER_LAND = Square.at(4, 2);
const WATER = Square.at(9, 9);
const NEXT_WATER = Square.at(9, 12);

describe("weather over the land", () => {
  const underWeather = (kind: "rain" | "storm" | "hurricane", contacts: number) => {
    const test = aWorld({ fortune: new LoadedDice().next(101, 40) });
    test.world.board.build(LAND, "school");
    launchOver(test.world, { kind, over: LAND });
    repeat(contacts, () => resolveContacts(test.world));
    return test;
  };

  it("levels a building after 25 moments of hurricane", () => {
    expect(underWeather("hurricane", 25).world.board.contentAt(LAND).occupant).toBe("nothing");
  });

  it("spares it at 24", () => {
    expect(underWeather("hurricane", 24).world.board.contentAt(LAND).occupant).toBe("school");
  });

  it("takes a tropical storm five times as long", () => {
    const occupants = [124, 125].map(
      (contacts) => underWeather("storm", contacts).world.board.contentAt(LAND).occupant,
    );

    expect(occupants).toEqual(["school", "nothing"]);
  });

  it("never lets rain level anything", () => {
    expect(underWeather("rain", 1000).world.board.contentAt(LAND).occupant).toBe("school");
  });

  it("costs lives when a building falls", () => {
    const test = underWeather("hurricane", 25);

    expect([
      test.world.islands.left.standing().population,
      test.events.ofType("itemSmitten"),
    ]).toEqual([
      960,
      [
        {
          type: "itemSmitten",
          side: "left",
          item: "school",
          cell: { row: 3, col: 2 },
          cause: "hurricane",
          casualties: 40,
        },
      ],
    ]);
  });

  it("wears down an island as a whole, carrying damage from one building to the next", () => {
    const { world } = aWorld();
    world.board.build(LAND, "house");
    world.board.build(OTHER_LAND, "factory");
    launchOver(world, { kind: "hurricane", over: LAND });
    repeat(15, () => resolveContacts(world));
    world.sea.clearAll();
    launchOver(world, { kind: "hurricane", over: OTHER_LAND });

    repeat(10, () => resolveContacts(world));

    expect(world.board.contentAt(OTHER_LAND).occupant).toBe("nothing");
  });

  it("rains a gold bar onto a crop's owner every 12 moments", () => {
    const { world, events } = aWorld();
    world.board.build(LAND, "crop");
    launchOver(world, { kind: "rain", over: LAND });

    repeat(12, () => resolveContacts(world));

    expect([world.islands.left.standing().goldThisRound, events.ofType("goldEarned")]).toEqual([
      1,
      [{ type: "goldEarned", side: "left", source: "rain", cell: { row: 3, col: 2 } }],
    ]);
  });

  it("rains gold from a storm as well", () => {
    const { world } = aWorld();
    world.board.build(LAND, "crop");
    launchOver(world, { kind: "storm", over: LAND });

    repeat(12, () => resolveContacts(world));

    expect(world.islands.left.standing().gold).toBe(101);
  });

  it("sinks an anchored boat that storm damage overwhelms", () => {
    const { world, events } = aWorld();
    world.board.anchor(HARBOURS.left, { side: "left", boat: "fishingBoat" });
    launchOver(world, { kind: "hurricane", over: HARBOURS.left });

    repeat(25, () => resolveContacts(world));

    expect(events.ofType("boatWrecked").map((wreck) => wreck.cause)).toEqual(["hurricane"]);
  });
});

describe("fishing", () => {
  it("earns an anchored boat's owner a gold bar for 50 moments over a school", () => {
    const { world, events } = aWorld();
    world.board.anchor(WATER, { side: "right", boat: "fishingBoat" });
    launchOver(world, { kind: "fish", over: WATER });

    repeat(50, () => resolveContacts(world));

    expect(events.ofType("goldEarned").map((gold) => [gold.side, gold.source])).toEqual([
      ["right", "fishing"],
    ]);
  });

  it("earns a boat under way its gold the same way", () => {
    const { world } = aWorld();
    sailOver(world, { side: "left", boat: "fishingBoat", over: WATER });
    launchOver(world, { kind: "fish", over: WATER });

    repeat(50, () => resolveContacts(world));

    expect(world.islands.left.standing().gold).toBe(101);
  });

  it("keeps the count toward the next bar", () => {
    const { world } = aWorld();
    sailOver(world, { side: "left", boat: "fishingBoat", over: WATER });
    launchOver(world, { kind: "fish", over: WATER });

    repeat(49, () => resolveContacts(world));

    expect(world.tallies.left.fishing.count()).toBe(49);
  });
});

describe("pirates", () => {
  it("sink an anchored fishing boat after 20 bumps", () => {
    const { world } = aWorld();
    world.board.anchor(WATER, { side: "left", boat: "fishingBoat" });
    launchOver(world, { kind: "pirate", over: WATER });

    repeat(20, () => resolveContacts(world));

    expect(world.board.contentAt(WATER).occupant).toBe("wreck");
  });

  it("leave a fishing boat alone beside its owner's fort", () => {
    const { world } = aWorld();
    world.board.build(Square.at(6, 3), "fort");
    world.board.anchor(HARBOURS.left, { side: "left", boat: "fishingBoat" });
    launchOver(world, { kind: "pirate", over: HARBOURS.left });

    repeat(40, () => resolveContacts(world));

    expect(world.board.contentAt(HARBOURS.left).occupant).toBe("fishingBoat");
  });

  it("sink a fishing boat under way on contact", () => {
    const { world, events } = aWorld();
    sailOver(world, { side: "left", boat: "fishingBoat", over: WATER });
    launchOver(world, { kind: "pirate", over: WATER });

    resolveContacts(world);

    expect(events.ofType("pilotSinking")).toEqual([
      { type: "pilotSinking", side: "left", boat: "fishingBoat", cause: "pirate" },
    ]);
  });

  it("stay away from a boat under way near any fort, even the other side's", () => {
    const { world } = aWorld();
    world.board.build(Square.at(6, 18), "fort");
    sailOver(world, { side: "left", boat: "fishingBoat", over: Square.at(6, 19) });
    launchOver(world, { kind: "pirate", over: Square.at(6, 19) });

    resolveContacts(world);

    expect(world.pilots.left.mode().name).toBe("sailing");
  });

  it("are stopped dead by a PT boat", () => {
    const { world } = aWorld();
    sailOver(world, { side: "right", boat: "ptBoat", over: WATER });
    launchOver(world, { kind: "pirate", over: WATER, velocity: { x: 3, y: 0 } });

    resolveContacts(world);

    expect(world.sea.inGroup("pirates")[0].velocity()).toEqual({ x: 0, y: 0 });
  });

  it("go down in a hurricane", () => {
    const { world, events } = aWorld();
    launchOver(world, { kind: "pirate", over: WATER });
    launchOver(world, { kind: "hurricane", over: WATER });

    resolveContacts(world);

    expect(events.ofType("pirateSinking")).toHaveLength(1);
  });
});

describe("PT boats", () => {
  it("sink an enemy's anchored fishing boat after 20 bumps", () => {
    const { world } = aWorld();
    world.board.anchor(WATER, { side: "left", boat: "fishingBoat" });
    sailOver(world, { side: "right", boat: "ptBoat", over: WATER });

    repeat(20, () => resolveContacts(world));

    expect(world.board.contentAt(WATER).occupant).toBe("wreck");
  });

  it("leave their own side's fishing boats alone", () => {
    const { world } = aWorld();
    world.board.anchor(WATER, { side: "right", boat: "fishingBoat" });
    sailOver(world, { side: "right", boat: "ptBoat", over: WATER });

    repeat(40, () => resolveContacts(world));

    expect(world.board.contentAt(WATER).occupant).toBe("fishingBoat");
  });

  it("sink an enemy fishing boat under way on contact", () => {
    const { world } = aWorld();
    sailOver(world, { side: "left", boat: "fishingBoat", over: WATER });
    sailOver(world, { side: "right", boat: "ptBoat", over: WATER });

    resolveContacts(world);

    expect(world.pilots.left.mode().name).toBe("sinking");
  });

  it("cannot sink a fishing boat beside its owner's fort", () => {
    const { world } = aWorld();
    world.board.build(Square.at(6, 3), "fort");
    sailOver(world, { side: "left", boat: "fishingBoat", over: HARBOURS.left });
    sailOver(world, { side: "right", boat: "ptBoat", over: HARBOURS.left });

    resolveContacts(world);

    expect(world.pilots.left.mode().name).toBe("sailing");
  });
});

describe("boats under way in weather", () => {
  it("go down in a hurricane", () => {
    const { world } = aWorld();
    sailOver(world, { side: "right", boat: "ptBoat", over: NEXT_WATER });
    launchOver(world, { kind: "hurricane", over: NEXT_WATER });

    resolveContacts(world);

    expect(world.pilots.right.mode().name).toBe("sinking");
  });

  it("ride out a tropical storm", () => {
    const { world } = aWorld();
    sailOver(world, { side: "right", boat: "fishingBoat", over: NEXT_WATER });
    launchOver(world, { kind: "storm", over: NEXT_WATER });

    resolveContacts(world);

    expect(world.pilots.right.mode().name).toBe("sailing");
  });
});
