/** When the people turn to rebellion, and when rebels lay down their arms, at a round's end. */
export interface RebellionRules {
  /** A round score this far below the last raises a rebel. */
  readonly dropThatRebels: number;
  /** A round score this far above the last disperses a rebel. */
  readonly riseThatPacifies: number;
  /** Otherwise a round score below this raises a rebel. */
  readonly unrestBelow: number;
  /** Otherwise a round score of at least this disperses a rebel. */
  readonly contentAt: number;
}

export type RebelMovement = "rise" | "disperse" | "none";

export interface ScoreTrend {
  readonly previous: number;
  readonly current: number;
}

export function rebelMovement(trend: ScoreTrend, rules: RebellionRules): RebelMovement {
  const drop = trend.previous - trend.current;
  if (drop >= rules.dropThatRebels) return "rise";
  if (-drop >= rules.riseThatPacifies) return "disperse";
  if (trend.current < rules.unrestBelow) return "rise";
  if (trend.current >= rules.contentAt) return "disperse";
  return "none";
}
