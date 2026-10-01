import { SeaChart, type Waters } from "./sea-chart.js";

/**
 * Where a governor keeps its chart of the sea. Boats sail past anchored boats, so the waters only
 * change while a wreck goes down; the chart, and every route worked out on it, is kept till then.
 */
export class ChartRoom {
  private chart: SeaChart | undefined;

  chartOf(waters: Waters): SeaChart {
    const fresh = SeaChart.of(waters);
    if (this.chart === undefined || !this.chart.showsSameWatersAs(fresh)) this.chart = fresh;
    return this.chart;
  }
}
