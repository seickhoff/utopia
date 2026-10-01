import type { GameEvent, RoundReport, Side } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { YearLog } from "../src/hud/year-log.js";
import { presentYearLog } from "../src/hud/year-log-presenter.js";

const CELL = { row: 2, col: 3 };

/** A year-end report with these figures, and nothing else of note. */
function reportWith(figures: { score: number; gold: number; births: number }): RoundReport {
  const deaths = 10;
  return {
    income: { factories: 0, fishingBoats: 0, productivity: 0, allowance: 10 },
    population: {
      before: 1000,
      fertility: 40,
      mortality: 11,
      births: figures.births,
      deaths,
      after: 1000 + figures.births - deaths,
    },
    goldEarned: figures.gold,
    score: { housing: 0, gdp: 0, food: 0, schools: 0, hospitals: 0, total: figures.score },
    witheredCrops: [],
    rebels: { kind: "none" },
  };
}

const yearEnds = (round: number): GameEvent => ({
  type: "roundEnded",
  round,
  reports: {
    left: reportWith({ score: 18, gold: 12, births: 37 }),
    right: reportWith({ score: 5, gold: 30, births: 8 }),
  },
});

const happened = {
  smitten: (side: Side): GameEvent => ({
    type: "itemSmitten",
    side,
    item: "house",
    cell: CELL,
    cause: "hurricane",
    casualties: 12,
  }),
  wrecked: (side: Side): GameEvent => ({
    type: "boatWrecked",
    side,
    boat: "fishingBoat",
    cell: CELL,
    cause: "storm",
  }),
  sank: (side: Side): GameEvent => ({
    type: "pilotSinking",
    side,
    boat: "ptBoat",
    cause: "pirate",
  }),
  rebelsSent: (side: Side): GameEvent => ({
    type: "rebelsLanded",
    side,
    cell: CELL,
    destroyed: "nothing",
    cause: "bought",
  }),
};

function logOf(events: readonly GameEvent[]): YearLog {
  const log = new YearLog();
  events.forEach((event) => log.record(event));
  return log;
}

describe("YearLog", () => {
  it("keeps each year's report as the year ends", () => {
    const log = logOf([yearEnds(1), yearEnds(2)]);

    expect(log.years().map((year) => year.year)).toEqual([1, 2]);
  });

  it("counts what weather and the sea cost each island during the year", () => {
    const log = logOf([
      happened.smitten("left"),
      happened.wrecked("right"),
      happened.sank("right"),
      yearEnds(1),
    ]);

    expect(log.years()[0].losses).toEqual({
      left: { buildings: 1, boats: 0, rebelsSent: 0 },
      right: { buildings: 0, boats: 2, rebelsSent: 0 },
    });
  });

  it("counts rebels a rival sends, on the island they land on", () => {
    const log = logOf([happened.rebelsSent("left"), yearEnds(1)]);

    expect(log.years()[0].losses.left.rebelsSent).toBe(1);
  });

  it("starts each year's count afresh", () => {
    const log = logOf([happened.smitten("left"), yearEnds(1), yearEnds(2)]);

    expect(log.years()[1].losses.left.buildings).toBe(0);
  });
});

describe("presentYearLog", () => {
  it("lists the latest year first", () => {
    const entries = presentYearLog(logOf([yearEnds(1), yearEnds(2)]).years()).entries;

    expect(entries.map((entry) => entry.title)).toEqual(["Year 2", "Year 1"]);
  });

  it("sets each island's figures side by side, line by line", () => {
    const [entry] = presentYearLog(logOf([happened.smitten("right"), yearEnds(1)]).years()).entries;

    expect(entry.lines.map((line) => [line.label, line.left, line.right])).toEqual([
      ["Score", "18", "5"],
      ["Gold earned", "12", "30"],
      ["Births − deaths", "+27", "-2"],
      ["Crops withered", "0", "0"],
      ["Lost to weather", "0", "1"],
      ["Boats lost", "0", "0"],
      ["Rebels sent in", "0", "0"],
      ["Rebels at year end", "—", "—"],
    ]);
  });

  it("is empty before the first year is out", () => {
    expect(presentYearLog([]).entries).toEqual([]);
  });
});
