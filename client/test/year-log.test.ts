import type { GameEvent, RoundReport, Side } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { YearLog } from "../src/hud/year-log.js";
import { presentYearLog } from "../src/hud/year-log-presenter.js";

const CELL = { row: 2, col: 3 };
const NAMES = { left: "ADA", right: "GRACE" };

/** The log presented for these years, its islands governed by Ada and Grace. */
const presented = (log: YearLog) => presentYearLog({ years: log.years(), names: NAMES });

interface Figures {
  readonly score: number;
  readonly gold: number;
  readonly births: number;
  readonly rebels?: RoundReport["rebels"];
}

/** A year-end report with these figures, and nothing else of note. */
function reportWith(figures: Figures): RoundReport {
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
    rebels: figures.rebels ?? { kind: "none" },
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

/** A year's end at which each island scored this. */
const yearScored = (round: number, scores: { left: number; right: number }): GameEvent => ({
  type: "roundEnded",
  round,
  reports: {
    left: reportWith({ score: scores.left, gold: 12, births: 37 }),
    right: reportWith({ score: scores.right, gold: 30, births: 8 }),
  },
});

/** A year's end at which rebels rose on the left island. */
const yearOfUprising = (round: number): GameEvent => ({
  type: "roundEnded",
  round,
  reports: {
    left: reportWith({
      score: 18,
      gold: 12,
      births: 37,
      rebels: { kind: "rose", cell: CELL, destroyed: "house" },
    }),
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
    const entries = presented(logOf([yearEnds(1), yearEnds(2)])).entries;

    expect(entries.map((entry) => entry.title)).toEqual(["Year 2", "Year 1"]);
  });

  it("sets each island's figures side by side, line by line", () => {
    const [entry] = presented(logOf([happened.smitten("right"), yearEnds(1)])).entries;

    expect(entry.lines.map((line) => [line.label, line.left, line.right])).toEqual([
      ["Score", "18", "5"],
      ["Gold earned", "12", "30"],
      ["Population", "1,027", "998"],
      ["Births − deaths", "+27", "-2"],
      ["Crops withered", "0", "0"],
      ["Lost to weather", "0", "1"],
      ["Boats lost", "0", "0"],
      ["Rebels sent in", "0", "0"],
      ["Rebels at year end", "—", "—"],
    ]);
  });

  it("is empty before the first year is out", () => {
    expect(presentYearLog({ years: [], names: NAMES }).entries).toEqual([]);
  });
});

describe("presentYearLog's charts", () => {
  const chartsOf = (events: readonly GameEvent[]) => presented(logOf(events)).charts;

  it("shows nothing before the first year is out, the first year as text, then charts", () => {
    const shown = [[], [yearEnds(1)], [yearEnds(1), yearEnds(2)]].map(
      (events) => presented(logOf(events)).shows,
    );

    expect(shown).toEqual(["nothing", "text", "charts"]);
  });

  it("runs each island's total score in the race, year by year", () => {
    const { readings } = chartsOf([yearEnds(1), yearEnds(2)]).race;

    expect(readings).toEqual({ left: ["18", "36"], right: ["5", "10"] });
  });

  it("says who leads the race after the latest year, and by how much", () => {
    expect(chartsOf([yearEnds(1), yearEnds(2)]).race.headline).toBe("ADA leads by 26");
  });

  it("calls the race neck and neck when the totals are even", () => {
    const even = [yearScored(1, { left: 9, right: 9 }), yearScored(2, { left: 4, right: 4 })];

    expect(chartsOf(even).race.headline).toBe("Neck and neck");
  });

  it("shades the gap between the totals for whoever leads, changing hands where they cross", () => {
    const overtaken = [
      yearScored(1, { left: 10, right: 20 }),
      yearScored(2, { left: 30, right: 5 }),
    ];

    expect(chartsOf(overtaken).race.patches.map((patch) => patch.side)).toEqual(["right", "left"]);
  });

  it("charts every figure of the year-end report", () => {
    const charts = chartsOf([yearEnds(1), yearEnds(2)]);

    expect([...charts.wide, ...charts.narrow].map((chart) => chart.title)).toEqual([
      "Score",
      "Gold earned",
      "Population",
      "Births − deaths",
      "Crops withered",
      "Lost to weather",
      "Boats lost",
      "Rebels sent in",
    ]);
  });

  it("reads each island's figure for each year", () => {
    const [score] = chartsOf([yearEnds(1), yearScored(2, { left: 40, right: 2 })]).wide;

    expect(score.readings).toEqual({ left: ["18", "40"], right: ["5", "2"] });
  });

  it("rules zero, and the foot, under a figure that falls below zero", () => {
    const growth = chartsOf([yearEnds(1), yearEnds(2)]).wide[3];

    expect(growth.ticks.map((tick) => tick.label)).toEqual(["50", "0", "-2"]);
  });

  it("marks the years rebels rose on each island", () => {
    const { marks } = chartsOf([yearEnds(1), yearOfUprising(2)]).uprisings;

    expect(marks).toEqual({ left: ["none", "rose"], right: ["none", "none"] });
  });
});
