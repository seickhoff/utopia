/**
 * The Intellivision hand controller's side buttons, as Utopia's overlay labels them: TOTAL (the
 * top pair) shows the total score, CENSUS the population and ROUND the last round's score.
 */
export type SideButton = "total" | "census" | "round";

export const SIDE_BUTTON_LABELS: Readonly<Record<SideButton, string>> = {
  total: "TOTAL",
  census: "CENSUS",
  round: "ROUND",
};
