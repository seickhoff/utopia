import type { GameSnapshot, Side } from "@utopia/engine";
import type { FinalViewModel, YearEndLine } from "./game-view.js";

export interface FinalInput {
  readonly snapshot: GameSnapshot;
  readonly mine: Side;
  /** A solo term with no rival is judged on its own. */
  readonly rivalled: boolean;
}

const AWARD_AVERAGE = 60;

/** The end of the term: who won, or how the governor fared alone. */
export function presentFinal(input: FinalInput): FinalViewModel {
  const { islands } = input.snapshot;
  const line = (label: string, value: (side: Side) => number): YearEndLine => ({
    label,
    left: value("left").toLocaleString("en-US"),
    right: value("right").toLocaleString("en-US"),
  });
  return {
    headline: headlineOf(input),
    lines: [
      line("Total score", (side) => islands[side].totalScore),
      line("Population", (side) => islands[side].population),
      line("Gold", (side) => islands[side].gold),
    ],
  };
}

function headlineOf(input: FinalInput): string {
  const { snapshot, mine } = input;
  const ownTotal = snapshot.islands[mine].totalScore;
  const rivalTotal = snapshot.islands[mine === "left" ? "right" : "left"].totalScore;
  if (!input.rivalled) return soloVerdict(ownTotal / snapshot.rounds);
  if (ownTotal === rivalTotal) return "A dead heat: the islands are tied";
  return ownTotal > rivalTotal
    ? "You win the Governor's Award!"
    : "Your rival wins the Governor's Award";
}

function soloVerdict(averageRound: number): string {
  return averageRound >= AWARD_AVERAGE
    ? "The Governor's Award is yours!"
    : "Your term is over: the people have spoken";
}
