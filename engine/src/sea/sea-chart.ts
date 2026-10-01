import { GRID_COLUMNS, GRID_ROWS, STATUS_ROW, Square } from "../geometry/square.js";

export interface Passage {
  readonly from: Square;
  readonly to: Square;
}

/** Anything that can tell a boat where it may sail, and what the sand bars count as shore. */
export interface Waters {
  isNavigable(square: Square): boolean;
  isShore(square: Square): boolean;
}

interface Heading {
  readonly rows: number;
  readonly cols: number;
}

interface Course {
  readonly row: number;
  readonly col: number;
  readonly heading: Heading;
  readonly goal: number;
}

const HEADINGS: readonly Heading[] = [-1, 0, 1].flatMap((rows) =>
  [-1, 0, 1].filter((cols) => rows !== 0 || cols !== 0).map((cols) => ({ rows, cols })),
);
/** Local copies: the route search reads them thousands of times a look. */
const COLUMNS = GRID_COLUMNS;
const SEA_ROWS = STATUS_ROW;
const GRID_SQUARES = GRID_ROWS * GRID_COLUMNS;
/** No way there at all. */
const UNCHARTED = Number.POSITIVE_INFINITY;
/** A slanting move is longer than a straight one, as the boat sails it. */
const SLANT = Math.SQRT2;
/** As far off as a square next door can be: a slanting move. */
const NEXT_DOOR = SLANT;
/** Two ways as long as each other, summed in another order, may differ in the last digit. */
const ROUNDING = 1e-9;

interface Approach {
  readonly from: number;
  readonly length: number;
}

/**
 * The open water round the islands, and the shortest way across it that the sand bars allow
 * (L_5320). A boat may move to any of the eight squares round it, but never slips diagonally past a
 * corner of land, and never sails on through a square with shore just beyond it along its course:
 * the sand bars would turn it back. Only its destination may lie against the shore, since the
 * boat is stopped as soon as it gets there. A slanting move counts as long as it is, so of the
 * ways with fewest moves the straightest is taken, not one that dips off and back.
 */
export class SeaChart {
  /** The distances to each destination asked about, worked out once per chart. */
  private readonly routes = new Map<number, number[]>();

  private constructor(
    private readonly navigable: readonly boolean[],
    private readonly shore: readonly boolean[],
  ) {}

  static of(waters: Waters): SeaChart {
    const squares = Array.from({ length: GRID_SQUARES }, (_, offset) => Square.fromOffset(offset));
    return new SeaChart(
      squares.map((square) => square.isSea() && waters.isNavigable(square)),
      squares.map((square) => waters.isShore(square)),
    );
  }

  /** Whether another chart shows the same waters, so this one's routes still hold. */
  showsSameWatersAs(other: SeaChart): boolean {
    const same = (mine: readonly boolean[], theirs: readonly boolean[]) =>
      mine.every((value, offset) => value === theirs[offset]);
    return same(this.navigable, other.navigable) && same(this.shore, other.shore);
  }

  /**
   * Where a boat bound for a square can stop: the square itself if it is open sea; otherwise the
   * open sea nearest it, and of those the nearest the boat, so it need not go round to the far side.
   */
  landfall(passage: Passage): Square {
    const { from, to } = passage;
    if (this.navigable[to.offset]) return to;
    const sea = this.navigable.flatMap((open, offset) => (open ? [Square.fromOffset(offset)] : []));
    const nearer = (square: Square, best: Square) =>
      crowFlies(square, to) - crowFlies(best, to) ||
      crowFlies(square, from) - crowFlies(best, from);
    return sea.reduce((best, square) => (nearer(square, best) < 0 ? square : best), sea[0] ?? to);
  }

  /**
   * The square to make for next; the destination itself once it is next door or out of reach. Of
   * the squares as few moves away, the one nearest the destination as the crow flies: a boat then
   * slants until it is in line, and runs straight, rather than weaving one square to the next.
   */
  nextWaypoint(passage: Passage): Square {
    const { to } = passage;
    const closer = this.squaresOneMoveCloser(passage);
    if (closer.length === 0) return to;
    return closer.reduce((best, square) =>
      crowFlies(square, to) < crowFlies(best, to) ? square : best,
    );
  }

  /** Whether a passage between squares next door is one move of a shortest way to the goal. */
  leadsToward(heading: { readonly passage: Passage; readonly goal: Square }): boolean {
    const { from, to } = heading.passage;
    const distances = this.routeTo(heading.goal.offset);
    const move = { rows: to.row - from.row, cols: to.col - from.col };
    const remaining = distances[from.offset] ?? UNCHARTED;
    const after = (distances[to.offset] ?? UNCHARTED) + lengthOf(move);
    return remaining !== UNCHARTED && Math.abs(after - remaining) < ROUNDING;
  }

  /** The squares round the boat a move nearer the destination: none once it is next door. */
  private squaresOneMoveCloser(passage: Passage): Square[] {
    const { from, to } = passage;
    const distances = this.routeTo(to.offset);
    const remaining = distances[from.offset] ?? UNCHARTED;
    if (remaining <= NEXT_DOOR || remaining === UNCHARTED) return [];
    const isCloser = (course: Course) =>
      Math.abs(distances[offsetAhead(course)] + lengthOf(course.heading) - remaining) < ROUNDING;
    return HEADINGS.map((heading) => ({ row: from.row, col: from.col, heading, goal: to.offset }))
      .filter((course) => this.canSail(course) && isCloser(course))
      .map((course) => Square.fromOffset(offsetAhead(course)));
  }

  private routeTo(goal: number): number[] {
    const known = this.routes.get(goal);
    if (known !== undefined) return known;
    const distances = this.distancesTo(goal);
    this.routes.set(goal, distances);
    return distances;
  }

  /** How far each square is from the goal by the shortest way, nearest squares settled first. */
  private distancesTo(goal: number): number[] {
    const distances = new Array<number>(GRID_SQUARES).fill(UNCHARTED);
    distances[goal] = 0;
    const open = [goal];
    while (open.length > 0) {
      const offset = takeNearest({ open, distances });
      for (const approach of this.approachesTo({ offset, goal })) {
        const length = distances[offset] + approach.length;
        if (length >= distances[approach.from]) continue;
        if (distances[approach.from] === UNCHARTED) open.push(approach.from);
        distances[approach.from] = length;
      }
    }
    return distances;
  }

  /** The squares a boat could sail from to reach this one, and how long each move is. */
  private approachesTo(arrival: { offset: number; goal: number }): Approach[] {
    const row = Math.floor(arrival.offset / COLUMNS);
    const col = arrival.offset % COLUMNS;
    const approaches: Approach[] = [];
    for (const heading of HEADINGS) {
      const from = {
        row: row - heading.rows,
        col: col - heading.cols,
        heading,
        goal: arrival.goal,
      };
      const length = lengthOf(heading);
      if (this.canSail(from)) approaches.push({ from: from.row * COLUMNS + from.col, length });
    }
    return approaches;
  }

  private canSail(course: Course): boolean {
    const { row, col, heading } = course;
    const aheadRow = row + heading.rows;
    const aheadCol = col + heading.cols;
    const clear =
      this.canEnter(row, col) &&
      this.canEnter(aheadRow, aheadCol) &&
      this.canEnter(aheadRow, col) &&
      this.canEnter(row, aheadCol);
    const arriving = offsetAhead(course) === course.goal;
    return clear && (arriving || this.hasWayOn(course)) && this.slipsPastSides(course);
  }

  /**
   * A slanting boat's middle passes through a square beside its step on the way, if only for a
   * frame, and the sand bars turn it back there if shore lies beyond that square along its course.
   */
  private slipsPastSides(course: Course): boolean {
    const { rows, cols } = course.heading;
    if (rows === 0 || cols === 0) return true;
    const from = course.row * COLUMNS + course.col;
    return !this.isShoreAt(from + 2 * rows * COLUMNS) && !this.isShoreAt(from + 2 * cols);
  }

  /** The sand bars look one square on along each axis a boat moves on (wrapping as the ROM does). */
  private hasWayOn(course: Course): boolean {
    const entered = offsetAhead(course);
    const { rows, cols } = course.heading;
    const across = cols === 0 || !this.isShoreAt(entered + cols);
    const down = rows === 0 || !this.isShoreAt(entered + rows * COLUMNS);
    return across && down;
  }

  private isShoreAt(offset: number): boolean {
    return this.shore[offset] ?? false;
  }

  private canEnter(row: number, col: number): boolean {
    const onSea = row >= 0 && row < SEA_ROWS && col >= 0 && col < COLUMNS;
    return onSea && this.navigable[row * COLUMNS + col];
  }
}

/** How long a move to a square next door is: a slanting move is the longer. */
function lengthOf(move: Heading): number {
  return move.rows !== 0 && move.cols !== 0 ? SLANT : 1;
}

/** Takes from the open squares the one nearest the goal, which no other way can bring nearer. */
function takeNearest(search: { open: number[]; distances: readonly number[] }): number {
  const { open, distances } = search;
  let nearest = 0;
  for (let index = 1; index < open.length; index += 1) {
    if (distances[open[index]] < distances[open[nearest]]) nearest = index;
  }
  return open.splice(nearest, 1)[0];
}

/** How far apart two squares are in a straight line, squared: enough to say which is nearer. */
function crowFlies(square: Square, to: Square): number {
  return (square.row - to.row) ** 2 + (square.col - to.col) ** 2;
}

function offsetAhead(course: { row: number; col: number; heading: Heading }): number {
  return (course.row + course.heading.rows) * COLUMNS + course.col + course.heading.cols;
}
