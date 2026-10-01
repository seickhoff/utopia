import { COLOURS } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { PALETTE_WORDS } from "../src/art/palette.js";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../src/classic/pixel-frame.js";
import {
  BORDER,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  composeBorder,
  screenLabels,
  type LabelScene,
} from "../src/classic/screen.js";
import { GOLD_READOUTS, type Readouts } from "../src/classic/status-row.js";

/** The cartridge's screenshots are 756 x 480, border and all. */
const SCREENSHOT_SHAPE = 756 / 480;

const CENSUS_HELD: Readouts = { left: "population", right: "population" };
const NAMES = { left: "ADA", right: "COMPUTER" } as const;
const IN_PLAY: LabelScene = {
  names: NAMES,
  readouts: GOLD_READOUTS,
  labels: "on",
  phase: "playing",
};
const labelsOf = (change: Partial<LabelScene>) => screenLabels({ ...IN_PLAY, ...change });
const labelled = (names: { left: string; right: string } = NAMES) => labelsOf({ names });

const below = (labels: ReturnType<typeof screenLabels>) =>
  labels.filter((label) => label.y > BORDER.down + FRAME_HEIGHT);
const above = (labels: ReturnType<typeof screenLabels>) =>
  labels.filter((label) => label.y < BORDER.down);

describe("the screen", () => {
  it("frames the picture in a border, to the shape of the cartridge's screenshots", () => {
    expect((SCREEN_WIDTH * 2) / SCREEN_HEIGHT).toBeCloseTo(SCREENSHOT_SHAPE, 1);
  });
});

describe("screenLabels", () => {
  it("names each number of the status bar, in the border beneath it", () => {
    expect(below(labelled()).map((label) => label.text)).toEqual(["GOLD", "YRS", "TIME", "GOLD"]);
  });

  it("colours each gold's name as its island", () => {
    const golds = below(labelled()).filter((label) => label.text === "GOLD");

    expect(golds.map((label) => label.colour)).toEqual([COLOURS.darkGreen, COLOURS.red]);
  });

  it("names each island's governor above their island, in its colour", () => {
    const named = above(labelled()).map((label) => [label.text, label.colour]);

    expect(named).toEqual([
      ["ADA", COLOURS.darkGreen],
      ["COMPUTER", COLOURS.red],
    ]);
  });

  it("keeps two of the longest names apart", () => {
    const [first, second] = above(labelled({ left: "BARTHOLOM", right: "MARGARETE" }));

    expect(first.x + first.text.length * 8).toBeLessThan(second.x);
  });

  it("keeps every name inside the border, clear of the picture", () => {
    const inside = labelled().every(
      (label) => label.y + 16 <= BORDER.down || label.y >= BORDER.down + FRAME_HEIGHT,
    );

    expect(inside).toBe(true);
  });
});

describe("screenLabels while a side button is held", () => {
  it("names nothing while the labels are off and the gold shows", () => {
    expect(labelsOf({ labels: "off" })).toEqual([]);
  });

  it("names the figure each corner shows, with the labels on or off", () => {
    const labels = labelsOf({ readouts: CENSUS_HELD, labels: "off" });

    expect(below(labels).map((label) => label.text)).toEqual(["CENSUS", "CENSUS"]);
  });

  it("moves the middle names aside while a figure is held", () => {
    const labels = labelsOf({ readouts: CENSUS_HELD });

    expect(below(labels).map((label) => label.text)).toEqual(["CENSUS", "CENSUS"]);
  });

  it("ends each corner's name where its figure ends, as the figures are right-aligned", () => {
    const held: Readouts = { left: "lastRound", right: "lastRound" };
    const [left] = below(labelsOf({ readouts: held, labels: "off" }));
    const figureEnds = BORDER.across + 5 * 8;

    expect(left.x + left.text.length * 8).toBe(figureEnds);
  });

  it("keeps a long name at the left corner on the screen", () => {
    const [left] = below(labelsOf({ readouts: CENSUS_HELD, labels: "off" }));

    expect(left.x).toBeGreaterThanOrEqual(0);
  });

  it("keeps a long name at the right corner inside the picture", () => {
    const labels = below(labelsOf({ readouts: CENSUS_HELD, labels: "off" }));
    const right = labels[labels.length - 1];

    expect(right.x + right.text.length * 8).toBeLessThanOrEqual(BORDER.across + FRAME_WIDTH);
  });
});

describe("screenLabels at year end", () => {
  it.each(["scores", "totals", "over"] as const)(
    "names nothing beneath the status bar at %s, whose own word names its figures",
    (phase) => {
      expect(below(labelsOf({ phase }))).toEqual([]);
    },
  );

  it("names nothing beneath the status bar while a side button is held", () => {
    expect(below(labelsOf({ phase: "over", readouts: CENSUS_HELD }))).toEqual([]);
  });

  it("still names each island's governor above their island", () => {
    const named = above(labelsOf({ phase: "over" })).map((label) => label.text);

    expect(named).toEqual(["ADA", "COMPUTER"]);
  });
});

describe("composeBorder", () => {
  it("paints the border the cartridge's blue", () => {
    expect(composeBorder([])[0]).toBe(PALETTE_WORDS[COLOURS.blue]);
  });

  it("paints a name's letters in its colour", () => {
    const label = { x: 20, y: 1, text: "I", colour: COLOURS.white };

    expect([...composeBorder([label])]).toContain(PALETTE_WORDS[COLOURS.white]);
  });
});
