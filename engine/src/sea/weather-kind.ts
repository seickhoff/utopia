/** Rain helps crops; tropical storms and hurricanes wear down whatever stands in their way. */
export type WeatherKind = "rain" | "storm" | "hurricane";

export interface WeatherRules {
  /** Weather tries to form on a roll of 0 on a die with this many sides, each tick. */
  readonly formationSides: number;
  /** Then a die with this many sides picks the kind: 0 a hurricane, 1-3 a storm, else rain. */
  readonly kindSides: number;
  readonly lastStormFace: number;
  /** What each kind adds to its island's storm damage for every moment over a building. */
  readonly damage: Readonly<Record<WeatherKind, number>>;
  /** Storm damage that levels a building or sinks an anchored boat. */
  readonly destroyAt: number;
  /** A levelled building kills a roll of this many sides worth of people (0-100). */
  readonly casualtySides: number;
}

export function weatherOfFace(face: number, rules: WeatherRules): WeatherKind {
  if (face === 0) return "hurricane";
  return face <= rules.lastStormFace ? "storm" : "rain";
}

/** Only a hurricane sinks boats under way and pirates (L_562E). */
export function sinksVessels(kind: WeatherKind): boolean {
  return kind === "hurricane";
}

export function isWeather(kind: string): kind is WeatherKind {
  return kind === "rain" || kind === "storm" || kind === "hurricane";
}
