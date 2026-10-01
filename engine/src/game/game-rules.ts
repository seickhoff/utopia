import type { EconomyRules } from "../economy/round-projection.js";
import type { Velocity } from "../geometry/disc.js";
import type { TallyRules } from "../island/tally.js";
import type { PilotSpeeds } from "../pilots/pilot-mode.js";
import type { CornerRules } from "../sea/corner-spawn.js";
import type { WeatherRules } from "../sea/weather-kind.js";

/** How weather, fish and pirates come and go (the timer task's first half). */
export interface SeaRules {
  readonly weather: WeatherRules;
  /** All weather forms at the top left, heading south-east (WTHR_TMPL). */
  readonly weatherStart: { readonly x: number; readonly y: number };
  readonly weatherHeading: Velocity;
  readonly fishSides: number;
  readonly pirateSides: number;
  /** Each tick, each drifter's course is nudged on a roll of 0 on a die with this many sides. */
  readonly nudgeSides: number;
  readonly corners: CornerRules;
  readonly tallies: TallyRules;
}

/** How long the year-end displays freeze the game (the cartridge's delay loops). */
export interface YearEndTiming {
  readonly scoresSeconds: number;
  readonly totalsSeconds: number;
}

/** Every number Utopia plays by, gathered at the top so the entities stay free of them. */
export interface GameRules {
  readonly economy: EconomyRules;
  readonly startingGold: number;
  readonly startingPopulation: number;
  readonly pilots: PilotSpeeds;
  /**
   * How far a unit of the EXEC's velocity carries a sprite each 60 Hz frame, in fine units
   * (768ths of a pixel). The EXEC moves sprites once a 20 Hz tick; 16 a frame is 1/16 pixel a
   * tick, which drifts weather across the sea in about twenty seconds.
   */
  readonly finePerUnitPerFrame: number;
  /** Each crop withers at a round's end on a roll of 0 on a die with this many sides. */
  readonly cropWitherSides: number;
  readonly timing: YearEndTiming;
  readonly sea: SeaRules;
}

/** The rules as the cartridge plays them (see docs/reference/mechanics.md). */
export const DEFAULT_RULES: GameRules = {
  startingGold: 100,
  startingPopulation: 1000,
  pilots: { cursorSpeed: 15, boatSpeed: 10 },
  finePerUnitPerFrame: 16,
  cropWitherSides: 3,
  timing: { scoresSeconds: 2.5, totalsSeconds: 2.5 },
  sea: {
    weather: {
      formationSides: 100,
      kindSides: 12,
      lastStormFace: 3,
      damage: { rain: 0, storm: 1, hurricane: 5 },
      destroyAt: 125,
      casualtySides: 101,
    },
    weatherStart: { x: 27, y: 0 },
    weatherHeading: { x: 4, y: 5 },
    fishSides: 20,
    pirateSides: 100,
    nudgeSides: 10,
    corners: { rowSpreadSides: 8, topY: 8, bottomY: 80, leftX: 0, rightX: 167, speed: 3 },
    tallies: { catchesPerGold: 50, showersPerGold: 12, rammingsToSink: 20 },
  },
  economy: {
    income: { goldPerFactory: 4, goldPerFishingBoat: 1, productivityCap: 30, allowance: 10 },
    population: {
      baseFertility: 40,
      fertilityCap: 64,
      fertilityPerCrop: 3,
      fertilityPerHospital: 3,
      fertilityPerHouse: 1,
      fertilityLostPerSchool: 3,
      baseMortality: 11,
      mortalitySavedPerHospital: 3,
      mortalityFloor: 2,
      mortalityPerFactory: 1,
      cap: 9999,
    },
    score: {
      peoplePerHouse: 500,
      housingDivisor: 3,
      gdpScale: 100,
      gdpDivisor: 12,
      peoplePerFoodSource: 500,
      foodDivisor: 3,
      partCap: 30,
      roundCap: 100,
    },
    rebellion: { dropThatRebels: 10, riseThatPacifies: 10, unrestBelow: 30, contentAt: 70 },
  },
};
