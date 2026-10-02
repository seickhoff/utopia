import {
  arc,
  fan,
  fence,
  ribbon,
  ribbonSkirt,
  straight,
  type ArcSpec,
  type Spot,
} from "../path-shapes.js";
import { disc } from "../round-shapes.js";
import { box, placed, rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { DECAL_LIFT, extent, ground, marking, point } from "./props.js";

/** A running track's red all-weather surface. */
export const TRACK = rgb("#b5523f");
/** A baseball infield's bare earth. */
export const INFIELD = rgb("#c08f5c");
const PAINT = rgb("#f2f1ea");
const TURF = rgb("#4f9a3e");
const MOWN = [rgb("#5aa447"), rgb("#4c933c")];
/** What a school's track and fields are laid in: the track, the pitch's turf, the ball field's earth and grass. */
export const PLAYING_SURFACES = [TRACK, TURF, INFIELD, ...MOWN];
const FENCE = rgb("#2f4f3a");
const NETTING = rgb("#9aa0a6");
const DUGOUT = rgb("#6d737c");
/** Paint and the infield's grass lie a little above the rest, and the pitcher's mound above that. */
const PAINT_LIFT = 0.009;
const MOUND_LIFT = 0.011;
const LINE_WIDTH = 0.003;
const BEND_STEPS = 6;
const LANE = 0.035;

export interface TrackSpec {
  readonly centre: Spot;
  /** How far each straight runs either side of the middle. */
  readonly reach: number;
  /** The radius of the bends, to the middle of the track. */
  readonly radius: number;
}

/** A running track: two straights and two bends round a football pitch, its lanes lined in white. */
export function runningTrack(spec: TrackSpec): Triangles[] {
  const lane = { path: oval(spec), width: LANE, top: DECAL_LIFT, colour: TRACK };
  const line = (radius: number) =>
    ribbon({ path: oval({ ...spec, radius }), width: LINE_WIDTH, top: PAINT_LIFT, colour: PAINT });
  const pitchSize = [2 * spec.reach + 0.05, 2 * spec.radius - LANE - 0.03] as const;
  return [
    ribbon(lane),
    ribbonSkirt({ ...lane, skirt: 0.004 }),
    line(spec.radius - LANE / 4),
    line(spec.radius + LANE / 4),
    ...pitch({ centre: spec.centre, size: pitchSize }),
  ];
}

/** The track's middle line: round from the middle of its north straight back to there again. */
function oval(spec: TrackSpec): Spot[] {
  const [x, z] = spec.centre;
  const { reach, radius } = spec;
  const legs = [
    straight({ from: [x, z - radius], to: [x + reach, z - radius], steps: 1 }),
    arc({ centre: [x + reach, z], radius, from: -Math.PI / 2, to: Math.PI / 2, steps: BEND_STEPS }),
    straight({ from: [x + reach, z + radius], to: [x - reach, z + radius], steps: 2 }),
    arc({
      centre: [x - reach, z],
      radius,
      from: Math.PI / 2,
      to: 1.5 * Math.PI,
      steps: BEND_STEPS,
    }),
    straight({ from: [x - reach, z - radius], to: [x, z - radius], steps: 1 }),
  ];
  return [legs[0], ...legs.slice(1).map((leg) => leg.slice(1))].flat();
}

/** A football pitch: turf marked with its touchlines, goal lines and halfway line. */
function pitch(spec: { centre: Spot; size: readonly [number, number] }): Triangles[] {
  const [x, z] = spec.centre;
  const [width, depth] = spec.size;
  const [east, south] = [width / 2 - 0.006, depth / 2 - 0.006];
  const across = (dx: number) =>
    marking({ spot: [x + dx, z], size: [LINE_WIDTH, depth - 0.012], colour: PAINT });
  const along = (dz: number) =>
    marking({ spot: [x, z + dz], size: [width - 0.012, LINE_WIDTH], colour: PAINT });
  return [
    ground({ spot: spec.centre, size: spec.size, colour: TURF }),
    ...[-east, 0, east].map(across),
    ...[-south, south].map(along),
  ];
}

/** How far the bases lie from one another, the infield's earth from home plate, and the fence. */
const BASE_PATH = 0.065;
const INFIELD_REACH = 0.11;
const OUTFIELD = 0.26;
const MOWN_BAND = (OUTFIELD - INFIELD_REACH) / 3;
/** Home plate, then first, second and third base, round from home plate. */
const BASES: readonly Spot[] = [
  [0, 0],
  [BASE_PATH, 0],
  [BASE_PATH, -BASE_PATH],
  [0, -BASE_PATH],
];
/** The field opens from home plate to the north-east: from due north round to due east. */
const NORTH = -Math.PI / 2;

/**
 * A baseball field with home plate at the given spot, opening to the north-east: the infield and
 * its diamond, the outfield mown in bands out to its fence, the foul lines, the backstop behind
 * home plate, and a dugout along each foul line.
 */
export function ballpark(home: Spot): District {
  const field = { home, at: ([dx, dz]: Spot): Spot => [home[0] + dx, home[1] + dz] };
  return {
    decals: [...infield(field), ...outfield(home), ...foulLines(field)],
    structures: [
      fence({ path: arc({ ...sweepFrom(home), radius: OUTFIELD }), height: 0.014, colour: FENCE }),
      fence({
        path: arc({ centre: home, radius: 0.03, from: Math.PI / 2, to: Math.PI, steps: 3 }),
        height: 0.03,
        colour: NETTING,
      }),
      dugout({ spot: field.at([0.05, 0.022]), turn: 0 }),
      dugout({ spot: field.at([-0.022, -0.05]), turn: Math.PI / 2 }),
    ],
  };
}

interface Field {
  readonly home: Spot;
  /** A spot on the field, given east and south of home plate. */
  readonly at: (offset: Spot) => Spot;
}

/** The sweep of the field round home plate, at whatever radius. */
function sweepFrom(home: Spot): Omit<ArcSpec, "radius"> {
  return { centre: home, from: NORTH, to: 0, steps: 8 };
}

/** The infield's earth, the square of grass inside the base paths, the mound and the bases. */
function infield(field: Field): Triangles[] {
  const middle = field.at([BASE_PATH / 2, -BASE_PATH / 2]);
  const grass = BASE_PATH - 0.016;
  return [
    fan({
      ...sweepFrom(field.home),
      radius: INFIELD_REACH,
      steps: 6,
      top: DECAL_LIFT,
      colour: INFIELD,
    }),
    marking({ spot: middle, size: [grass, grass], colour: MOWN[0] }),
    disc({ base: point(middle, MOUND_LIFT), radius: 0.008, sides: 6, colour: INFIELD }),
    ...BASES.map((base) => marking({ spot: field.at(base), size: [0.006, 0.006], colour: PAINT })),
  ];
}

/** The outfield's grass, mown in bands round home plate out to the fence. */
function outfield(home: Spot): Triangles[] {
  return [0, 1, 2].map((band) =>
    ribbon({
      path: arc({ ...sweepFrom(home), radius: INFIELD_REACH + (band + 0.5) * MOWN_BAND }),
      width: MOWN_BAND,
      top: DECAL_LIFT,
      colour: MOWN[band % 2],
    }),
  );
}

/** The foul lines, from home plate out along the field's two edges to its fence. */
function foulLines(field: Field): Triangles[] {
  const ends: readonly Spot[] = [field.at([0, -OUTFIELD]), field.at([OUTFIELD, 0])];
  return ends.map((end) =>
    ribbon({
      path: straight({ from: field.home, to: end, steps: 3 }),
      width: LINE_WIDTH,
      top: PAINT_LIFT,
      colour: PAINT,
    }),
  );
}

function dugout(spec: { spot: Spot; turn: number }): Triangles {
  const shelter = box({
    base: point([0, 0], 0),
    size: extent([0.036, 0.012, 0.012]),
    colour: DUGOUT,
  });
  return placed(shelter, { offset: point(spec.spot, 0), turn: spec.turn });
}
