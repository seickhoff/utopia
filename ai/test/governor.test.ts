import {
  DISC_DIRECTIONS,
  DISC_RELEASED,
  FRAMES_PER_TICK,
  PILOT_STARTS,
  SIDES,
  opponentOf,
} from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { DIFFICULTIES } from "../src/difficulty.js";
import { aMatch, type GovernedMatch } from "./support/governed-match.js";

const ROUND_SECONDS = 30;
const BUILDING_KEYS = [1, 2, 3, 4, 5, 6];
const SHORT_TERM = { rounds: 3, roundSeconds: ROUND_SECONDS };
const SEEDS = [1, 2, 3, 4, 5];
/** Whole games take a few seconds to play out. */
const WHOLE_GAMES = { timeout: 30_000 };

describe("the computer governor's hands", () => {
  it("plays only through its controls: with them cut, its island never changes", () => {
    const match = aMatch().governedBy("left", "hard").withControlsCut("left").begun().play(20);
    const { gold, counts, pilot } = match.snapshot().islands.left;

    expect([gold, Object.values(counts).every((count) => count === 0), pilot.x, pilot.y]).toEqual([
      100,
      true,
      PILOT_STARTS.left.x,
      PILOT_STARTS.left.y,
    ]);
  });

  it("tries to play all the same, sending commands into its cut controls", () => {
    const match = aMatch().governedBy("left", "hard").withControlsCut("left").begun().play(20);

    expect(match.controls("left").commands.length).toBeGreaterThan(0);
  });

  it("presses only the disc and keys a hand controller has", () => {
    const match = aMatch().governedBy("right", "normal").begun().play(ROUND_SECONDS);
    const readings = match.controls("right").discReadings();
    const keys = match.controls("right").keys();

    expect([
      readings.every(
        (reading) => reading === DISC_RELEASED || (reading >= 0 && reading < DISC_DIRECTIONS),
      ),
      keys.every((key) => key === "clear" || key === "enter" || (key >= 0 && key <= 9)),
    ]).toEqual([true, true]);
  });

  it("flies the cursor onto the square it builds on, letting go of the disc on arrival", () => {
    const match = aMatch()
      .governedBy("left", "normal")
      .begun()
      .play(ROUND_SECONDS - 1);
    const [firstBuilding] = match.events
      .ofType("itemBought")
      .filter((bought) => bought.item !== "fishingBoat");
    const press = match
      .keyPresses("left")
      .find((pressed) => BUILDING_KEYS.includes(pressed.key as number));

    expect([press?.pilot, press?.held]).toEqual([firstBuilding.cell, DISC_RELEASED]);
  });

  it("stands still while the year-end scores are up", () => {
    const match = aMatch()
      .governedBy("left", "hard")
      .begun()
      .play(ROUND_SECONDS + 0.2);
    const commandsAtYearEnd = match.controls("left").commands.length;

    match.play(2);

    expect(match.controls("left").commands.length).toBe(commandsAtYearEnd);
  });
});

describe("the computer governor's play", () => {
  it.each(DIFFICULTIES)("buys a fishing boat in the first round (%s)", (difficulty) => {
    const match = aMatch()
      .governedBy("left", difficulty)
      .begun()
      .play(ROUND_SECONDS - 1);

    const boats = match.events
      .ofType("itemBought")
      .filter((bought) => bought.item === "fishingBoat");

    expect(boats.map((bought) => bought.side)).toContain("left");
  });

  it("plays as well looking once a tick as once a frame, never razzing", WHOLE_GAMES, () => {
    const match = aMatch()
      .withOptions(SHORT_TERM)
      .governedBy("left", "hard")
      .governedBy("right", "normal")
      .lookingEvery(FRAMES_PER_TICK)
      .begun()
      .playToEnd();
    const boughtBySide = SIDES.map(
      (side) => match.events.ofType("itemBought").filter((bought) => bought.side === side).length,
    );

    expect([match.events.ofType("razzed"), boughtBySide.every((count) => count >= 3)]).toEqual([
      [],
      true,
    ]);
  });

  it("finishes CPU-against-CPU games from five seeds", WHOLE_GAMES, () => {
    expect(fiveGames().map((match) => match.snapshot().phase)).toEqual(SEEDS.map(() => "over"));
  });

  it("seldom razzes: an order refused is not tried again and again", WHOLE_GAMES, () => {
    const razzes = fiveGames().flatMap((match) => match.events.ofType("razzed"));

    expect(razzes.length).toBeLessThan(SEEDS.length * SHORT_TERM.rounds);
  });

  it("scores more on hard than on easy, on average over several games", WHOLE_GAMES, () => {
    const totals = totalsOfHardAgainstEasy();

    expect(average(totals.hard)).toBeGreaterThan(average(totals.easy));
  });
});

let playedGames: GovernedMatch[] = [];

/** Five whole games, each difficulty against another, played once and shared by the tests. */
function fiveGames(): GovernedMatch[] {
  if (playedGames.length === 0) {
    playedGames = SEEDS.map((seed) =>
      aMatch()
        .withSeed(seed)
        .withOptions(SHORT_TERM)
        .governedBy("left", DIFFICULTIES[seed % DIFFICULTIES.length])
        .governedBy("right", DIFFICULTIES[(seed + 1) % DIFFICULTIES.length])
        .begun()
        .playToEnd(),
    );
  }
  return playedGames;
}

const MATCH_SEEDS = [11, 12, 13];
const LONGER_TERM = { rounds: 5, roundSeconds: 45 };

/** Hard against easy from each seed, hard taking each side in turn. */
function totalsOfHardAgainstEasy(): { hard: number[]; easy: number[] } {
  const played = MATCH_SEEDS.flatMap((seed) =>
    SIDES.map((hardSide) => {
      const match = aMatch()
        .withSeed(seed)
        .withOptions(LONGER_TERM)
        .governedBy(hardSide, "hard")
        .governedBy(opponentOf(hardSide), "easy")
        .begun()
        .playToEnd();
      return { hard: match.total(hardSide), easy: match.total(opponentOf(hardSide)) };
    }),
  );
  return { hard: played.map((game) => game.hard), easy: played.map((game) => game.easy) };
}

function average(totals: readonly number[]): number {
  return totals.reduce((sum, total) => sum + total, 0) / totals.length;
}
