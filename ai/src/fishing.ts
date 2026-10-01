import {
  GRID_COLUMNS,
  HARBOURS,
  PixelPoint,
  SPRITE_LOOKS,
  STATUS_ROW,
  Square,
  squareAnchor,
  type DrifterKind,
  type SpriteLookSnapshot,
  type SpriteSnapshot,
} from "@utopia/engine";
import type { IslandView } from "./island-view.js";

export interface Chase {
  readonly view: IslandView;
  /** What the governor steers clear of: hurricanes sink boats under way, pirates catch them. */
  readonly hazards: readonly DrifterKind[];
}

/**
 * How close each hazard may come, in pixels between middles, before a boat runs from it (or leaves
 * the fish beside it be). A hurricane is big and drifts where it will; a pirate must touch a boat.
 */
const BERTH: Readonly<Record<DrifterKind, number>> = {
  hurricane: 28,
  storm: 0,
  rain: 0,
  pirate: 16,
  fish: 0,
};
/** A boat's sprite (like the cursor) is 8 pixels square. */
const PILOT_HALF = 4;
const SCANLINES_PER_PIXEL = 2;
const BITS_PER_ROW = 8;
/** Fish and pirates come in along the top two rows and the bottom two (L_526A). */
const PIRATE_LANES: readonly number[] = [0, 1, 9, 10];
/** All weather forms at the top left (WTHR_TMPL), so hurricanes pass there first. */
const STORM_CORNER = { lastRow: 4, lastCol: 7 };
/** The squares one step along each axis, as BACKTAB offsets. */
const ALONG_AXES: readonly number[] = [1, -1, GRID_COLUMNS, -GRID_COLUMNS];
/** What each drawback of an anchorage costs, in squares of sailing to avoid it. */
const LANE_COST = 6;
const STORM_CORNER_COST = 12;
const FORT_SHELTER = 8;

/** Where a fishing boat should make for now: away from danger, onto fish, or nowhere yet. */
export function fishingTarget(chase: Chase): PixelPoint {
  const [threat] = threatsNear(chase);
  if (threat !== undefined) return flightFrom({ view: chase.view, threat });
  const [school] = safeSchools(chase);
  return school === undefined ? chase.view.pilotPoint() : new PixelPoint(school.x, school.y);
}

/**
 * Open water to drop anchor in, best first: near, out of harm's way, and clear of harbours. Only
 * water with no shore beside it will do: there a boat comes to rest however it sails in, where a
 * sand bar beyond would turn it back before a governor looking once a tick could let go.
 */
export function anchoragesFor(view: IslandView): Square[] {
  const costOf = (square: Square) => anchorageCost({ view, square });
  return seaSquares()
    .filter((square) => view.isOpenWater(square) && !isHarbour(square))
    .filter((square) => !isBesideShore({ view, square }))
    .sort((one, other) => costOf(one) - costOf(other));
}

function threatsNear(chase: Chase): SpriteSnapshot[] {
  const pilot = pilotCentre(chase.view);
  return hazardsOf(chase)
    .filter((hazard) => isTooClose({ hazard, to: pilot }))
    .sort((one, other) => apart(centreOf(one), pilot) - apart(centreOf(other), pilot));
}

function safeSchools(chase: Chase): SpriteLookSnapshot[] {
  const pilot = chase.view.pilotPoint();
  const hazards = hazardsOf(chase);
  return chase.view
    .sprites("fish")
    .filter((fish) => hazards.every((hazard) => !isTooClose({ hazard, to: centreOf(fish) })))
    .sort((one, other) => apart(one, pilot) - apart(other, pilot));
}

function isTooClose(nearness: { hazard: SpriteSnapshot; to: PixelPoint }): boolean {
  const { hazard, to } = nearness;
  return apart(centreOf(hazard), to) < BERTH[hazard.kind];
}

function hazardsOf(chase: Chase): SpriteSnapshot[] {
  return chase.hazards.flatMap((kind) => chase.view.sprites(kind));
}

/** The open water next to the boat farthest from the threat; it looks again every moment. */
function flightFrom(escape: { view: IslandView; threat: SpriteSnapshot }): PixelPoint {
  const { view } = escape;
  const threat = centreOf(escape.threat);
  const distanceOf = (square: Square) => apart(squareMiddle(square), threat);
  const [refuge] = view
    .pilotSquare()
    .neighbours()
    .filter((square) => view.isNavigable(square))
    .sort((one, other) => distanceOf(other) - distanceOf(one));
  return refuge === undefined ? view.pilotPoint() : squareAnchor(refuge);
}

function squareMiddle(square: Square): PixelPoint {
  const { x, y } = squareAnchor(square);
  return new PixelPoint(x + PILOT_HALF, y + PILOT_HALF);
}

function anchorageCost(mooring: { view: IslandView; square: Square }): number {
  const { view, square } = mooring;
  const here = view.pilotSquare();
  const sailing = Math.max(Math.abs(square.row - here.row), Math.abs(square.col - here.col));
  const inLane = PIRATE_LANES.includes(square.row) ? LANE_COST : 0;
  const inStormCorner = isInStormCorner(square) ? STORM_CORNER_COST : 0;
  const sheltered = view.isGuarded(square) ? FORT_SHELTER : 0;
  return sailing + inLane + inStormCorner - sheltered;
}

/** The sand bars look along the rows and columns, wrapping from row to row as the ROM does. */
function isBesideShore(mooring: { view: IslandView; square: Square }): boolean {
  const { view, square } = mooring;
  return ALONG_AXES.some((step) => view.isShore(square.shiftedBy(step)));
}

function isInStormCorner(square: Square): boolean {
  return square.row <= STORM_CORNER.lastRow && square.col <= STORM_CORNER.lastCol;
}

function isHarbour(square: Square): boolean {
  return square === HARBOURS.left || square === HARBOURS.right;
}

function seaSquares(): Square[] {
  return Array.from({ length: STATUS_ROW * GRID_COLUMNS }, (_, offset) =>
    Square.fromOffset(offset),
  );
}

function pilotCentre(view: IslandView): PixelPoint {
  const { x, y } = view.pilotPoint();
  return new PixelPoint(x + PILOT_HALF, y + PILOT_HALF);
}

/** The middle of a sprite as drawn: wide sprites double their pixels, tall ones their rows. */
function centreOf(sprite: SpriteLookSnapshot): PixelPoint {
  const look = SPRITE_LOOKS[sprite.look];
  const width = BITS_PER_ROW * look.pixelsPerBit;
  const height = (look.rows * look.scanlinesPerRow) / SCANLINES_PER_PIXEL;
  return new PixelPoint(sprite.x + width / 2, sprite.y + height / 2);
}

function apart(one: { x: number; y: number }, other: { x: number; y: number }): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}
