import { pseudoRandom } from "./random.js";
import type { Vec3 } from "./shapes.js";

/** A straight stretch of a lightning bolt. */
export interface BoltSegment {
  readonly from: Vec3;
  readonly to: Vec3;
  /** How far its glow reaches out to either side of it. */
  readonly width: number;
  /** How bright it burns at the stroke's height, 0 to 1. */
  readonly brightness: number;
  /** How far down its way to the ground the leader must have come for it to show, 0 to 1. */
  readonly reach: number;
  /** Whether it is on the channel the stroke returns up, rather than a branch off it. */
  readonly main: boolean;
}

/** How many times each kind of stretch is halved and its middle knocked aside. */
const CHANNEL_DEPTH = 5;
const BRANCH_DEPTH = 3;
/** How far a middle is knocked aside, as a share of its stretch's length. */
const ROUGHNESS = 0.32;
const CHANNEL = { width: 0.05, brightness: 1 };
const BRANCH = { width: 0.024, brightness: 0.55 };
const BRANCHES = 4;

/**
 * A bolt of lightning from a cloud to the ground: a channel zigzagging down as a real one does,
 * every stretch of it kinked at random, with fainter, thinner branches forking off it and
 * reaching on downward without ever meeting the ground. Each seed strikes a new shape.
 */
export function boltShape(strike: { from: Vec3; to: Vec3; seed: number }): BoltSegment[] {
  const random = sequence(strike.seed);
  const channel = jagged({ from: strike.from, to: strike.to, depth: CHANNEL_DEPTH, random });
  const main = segmentsOf({ points: channel, look: CHANNEL, reach: [0, 1], main: true });
  const branches = Array.from({ length: BRANCHES }, () =>
    branch({ channel, strike, random }),
  ).flat();
  return [...main, ...branches];
}

/** One branch, forking from the channel partway down and reaching on down and away from it. */
function branch(fork: {
  channel: Vec3[];
  strike: { from: Vec3; to: Vec3 };
  random: () => number;
}): BoltSegment[] {
  const { channel, strike, random } = fork;
  const at = Math.floor((0.12 + 0.55 * random()) * (channel.length - 1));
  const start = channel[at];
  const drop = (start.y - strike.to.y) * (0.25 + 0.3 * random());
  const angle = random() * Math.PI * 2;
  const out = drop * (0.6 + 0.6 * random());
  const end = {
    x: start.x + Math.cos(angle) * out,
    y: start.y - drop,
    z: start.z + Math.sin(angle) * out,
  };
  const points = jagged({ from: start, to: end, depth: BRANCH_DEPTH, random });
  const whole = strike.from.y - strike.to.y;
  const startReach = at / (channel.length - 1);
  return segmentsOf({
    points,
    look: BRANCH,
    reach: [startReach, startReach + drop / whole],
    main: false,
  });
}

/** Points from one end to the other, each middle knocked aside in turn, down to the depth asked. */
function jagged(line: { from: Vec3; to: Vec3; depth: number; random: () => number }): Vec3[] {
  let points = [line.from, line.to];
  for (let level = 0; level < line.depth; level += 1) {
    points = points.flatMap((point, index) =>
      index === 0
        ? [point]
        : [knocked({ a: points[index - 1], b: point, random: line.random }), point],
    );
  }
  return points;
}

/** The middle of a stretch, knocked aside across it, and a little up or down. */
function knocked(stretch: { a: Vec3; b: Vec3; random: () => number }): Vec3 {
  const { a, b, random } = stretch;
  const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const aside = () => (random() - 0.5) * length * ROUGHNESS * 2;
  return {
    x: (a.x + b.x) / 2 + aside(),
    y: (a.y + b.y) / 2 + aside() * 0.15,
    z: (a.z + b.z) / 2 + aside(),
  };
}

function segmentsOf(run: {
  points: readonly Vec3[];
  look: { width: number; brightness: number };
  reach: readonly [number, number];
  main: boolean;
}): BoltSegment[] {
  const [first, last] = run.reach;
  const steps = run.points.length - 1;
  return run.points.slice(1).map((to, index) => ({
    from: run.points[index],
    to,
    ...run.look,
    reach: first + ((last - first) * index) / steps,
    main: run.main,
  }));
}

/** A run of numbers from 0 to 1 that a seed always gives the same. */
function sequence(seed: number): () => number {
  let step = 0;
  return () => {
    step += 1;
    return pseudoRandom(seed * 7919 + step * 1.618);
  };
}

/** A strike at a moment of it: how far down the leader has come, how bright it burns, whether it is over. */
export interface StrikeMoment {
  readonly reach: number;
  readonly brightness: number;
  readonly over: boolean;
}

/** How long the leader takes to step down from the cloud to the ground. */
const LEADER_SECONDS = 0.06;
const LEADER_GLOW = 0.35;
/** The strokes up the channel once the leader has found the ground: the first, then strikes again. */
const STROKES = [
  { at: 0.06, peak: 1 },
  { at: 0.2, peak: 0.85 },
  { at: 0.34, peak: 0.6 },
];
/** How long each stroke holds at its peak, and how fast it fades after. */
const STROKE_HOLD = 0.03;
const STROKE_FADE = 0.045;
const STRIKE_SECONDS = 0.7;

/**
 * A strike, so many seconds after it began: its leader stepping down faintly, then the channel
 * flaring as the stroke returns up it, fading, and flaring again, as real lightning flickers.
 */
export function strikeAt(age: number): StrikeMoment {
  const over = age >= STRIKE_SECONDS;
  const reach = Math.min(1, age / LEADER_SECONDS);
  const strokes = Math.max(...STROKES.map((stroke) => strokeGlow({ ...stroke, age })));
  const brightness = over ? 0 : age < LEADER_SECONDS ? LEADER_GLOW : strokes;
  return { reach, brightness, over };
}

function strokeGlow(stroke: { at: number; peak: number; age: number }): number {
  const since = stroke.age - stroke.at;
  if (since < 0) return 0;
  return stroke.peak * Math.exp(-Math.max(0, since - STROKE_HOLD) / STROKE_FADE);
}
