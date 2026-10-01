import { HARBOURS } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { ChartRoom } from "../src/chart-room.js";
import { Errand } from "../src/errand.js";
import { Raid } from "../src/seafaring.js";
import { aPosition } from "./support/position.js";
import { Stagehand } from "./support/stagehand.js";

describe("the chart room", () => {
  it("keeps the chart it has while the waters are unchanged", () => {
    const charts = new ChartRoom();
    const first = charts.chartOf(aPosition().view("left"));

    expect(charts.chartOf(aPosition().withBoat("left", "fishingBoat").view("left"))).toBe(first);
  });

  it("draws a fresh chart once a wreck blocks the water", () => {
    const charts = new ChartRoom();
    const position = aPosition().withBoat("right", "fishingBoat").sailing("left", "ptBoat");
    const stagehand = new Stagehand({ game: position.game(), side: "left" });
    const first = charts.chartOf(stagehand.view());

    stagehand.run(new Errand(new Raid(HARBOURS.right).stepsAt()), { seconds: 60 });

    expect(charts.chartOf(stagehand.view())).not.toBe(first);
  });
});
