import {
  ItemCounts,
  projectRound,
  type GameRules,
  type ItemTally,
  type RoundIncome,
  type RoundProjection,
} from "@utopia/engine";

/** Where an island stands before a round is scored. */
export interface Prospect {
  readonly counts: ItemTally;
  readonly population: number;
  readonly goldThisRound: number;
  readonly lastRoundScore: number;
}

/** What the rounds ahead should bring: their scores, and the gold earned toward more building. */
export interface Outlook {
  readonly points: number;
  readonly gold: number;
}

export interface OutlookRequest {
  readonly start: Prospect;
  readonly rounds: number;
  readonly rules: GameRules;
}

/**
 * What a rebel band costs in points: it razes whatever stands where it lands, and holds the square.
 * Keeping the round score from dropping 10 or below 30 is worth about a building's round.
 */
const REBELS_RISING = -10;
/** Rebels that lay down their arms give a square back. */
const REBELS_DISPERSING = 3;
const NOTHING_AHEAD: Outlook = { points: 0, gold: 0 };

/**
 * The outlook for an island left as it is, round by round, reckoned as the cartridge scores each
 * round's end. Crops wither by chance, so each is counted at its odds of lasting.
 */
export function outlookOf(request: OutlookRequest): Outlook {
  let prospect = request.start;
  let outlook = NOTHING_AHEAD;
  for (let round = 0; round < request.rounds; round += 1) {
    const counts = ItemCounts.of(prospect.counts);
    const projection = projectRound({ ...prospect, counts }, request.rules.economy);
    outlook = {
      points: outlook.points + pointsFor({ projection, prospect }),
      gold: outlook.gold + earnedGold(projection.income),
    };
    prospect = nextProspect({ prospect, projection, rules: request.rules });
  }
  return outlook;
}

interface RoundEnd {
  readonly prospect: Prospect;
  readonly projection: RoundProjection;
}

function pointsFor(roundEnd: RoundEnd): number {
  const { projection, prospect } = roundEnd;
  const rebels = prospect.counts.rebel ?? 0;
  if (projection.rebels === "rise") return projection.score.total + REBELS_RISING;
  if (projection.rebels === "disperse" && rebels > 0) {
    return projection.score.total + REBELS_DISPERSING;
  }
  return projection.score.total;
}

/** The allowance is paid whatever a governor does, so only the gold an island earns counts. */
function earnedGold(income: RoundIncome): number {
  return income.factories + income.fishingBoats + income.productivity;
}

function nextProspect(roundEnd: RoundEnd & { readonly rules: GameRules }): Prospect {
  const { prospect, projection, rules } = roundEnd;
  const lasting = 1 - 1 / rules.cropWitherSides;
  const crops = (prospect.counts.crop ?? 0) * lasting;
  return {
    counts: { ...prospect.counts, crop: crops },
    population: projection.population.after,
    goldThisRound: 0,
    lastRoundScore: projection.score.total,
  };
}
