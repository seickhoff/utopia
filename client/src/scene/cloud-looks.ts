import type { WeatherKind } from "@utopia/engine";

export interface RainLook {
  readonly colour: string;
  readonly opacity: number;
  /** How fast the streaks fall: curtain heights a second. */
  readonly speed: number;
  /** How thick the grey haze of falling water between the streaks is, 0 to 1. */
  readonly veil: number;
}

export interface CloudLook {
  /** Half the width of the cloud, in squares. */
  readonly radius: number;
  /** How high it floats over the sea. */
  readonly height: number;
  /** Its colour where the sun catches it, and in its hollows. */
  readonly light: string;
  readonly shade: string;
  /** 1 for a hurricane's spiral, 0 for a heaped cumulus. */
  readonly spiral: number;
  /** How much of the sunlight its shadow takes away, 0 to 1. */
  readonly shadow: number;
  readonly rain: RainLook | "dry";
  readonly lightningPerMinute: number;
}

/**
 * How each kind of weather looks: a rain cloud white and heaped, a storm dark and flashing, a
 * hurricane a great spiral seen from space. Every one of them casts its shape as a shadow.
 */
export const CLOUD_LOOKS: Readonly<Record<WeatherKind, CloudLook>> = {
  rain: {
    radius: 1.7,
    height: 1.5,
    light: "#ffffff",
    shade: "#8f9bb0",
    spiral: 0,
    shadow: 0.55,
    rain: { colour: "#dce8ff", opacity: 0.75, speed: 1.6, veil: 0.14 },
    lightningPerMinute: 0,
  },
  storm: {
    radius: 1.9,
    height: 1.45,
    light: "#6d7486",
    shade: "#1d1f28",
    spiral: 0,
    shadow: 0.8,
    rain: { colour: "#c8d4ea", opacity: 0.9, speed: 2.4, veil: 0.3 },
    lightningPerMinute: 14,
  },
  hurricane: {
    radius: 2.9,
    height: 1.05,
    light: "#ffffff",
    shade: "#a9b3c2",
    spiral: 1,
    shadow: 0.6,
    rain: "dry",
    lightningPerMinute: 0,
  },
};

export interface Lightning {
  /** 0 between flashes, up to 1 at a flash's height. */
  readonly brightness: number;
  /** Which flash this is, counting from the storm's birth: each strikes somewhere new. */
  readonly flash: number;
}

/** A bright flash, then a fainter flicker, as fractions of the time between flashes. */
const FLICKERS = [
  { from: 0, to: 0.03, brightness: 1 },
  { from: 0.05, to: 0.07, brightness: 0.7 },
];

/** A storm's lightning at this moment, flashing so many times a minute at its own rhythm. */
export function lightningAt(storm: { seconds: number; seed: number; look: CloudLook }): Lightning {
  const flashes = (storm.seconds * storm.look.lightningPerMinute) / 60 + storm.seed * 7;
  const phase = fraction(flashes);
  const flicker = FLICKERS.find((each) => phase >= each.from && phase < each.to);
  const striking = storm.look.lightningPerMinute > 0 && flicker !== undefined;
  return { brightness: striking ? flicker.brightness : 0, flash: Math.floor(flashes) };
}

function fraction(value: number): number {
  return value - Math.floor(value);
}
