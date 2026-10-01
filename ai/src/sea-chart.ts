import { GRID_COLUMNS, GRID_ROWS, STATUS_ROW, Square } from "@utopia/engine";

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
const NEXT_DOOR = 1;
const UNCHARTED = -1;

/**
 * The open water round the islands, and the shortest way across it that the sand bars allow
 * (L_5320). A boat may move to any of the eight squares round it, but never slips diagonally past a
 * corner of land, and never sails on through a square with shore just beyond it along its course:
 * the sand bars would turn it back. Only its destination may lie against the shore, since the
 * boat is stopped as soon as it gets there.
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

  /** The square to make for next; the destination itself once it is next door or out of reach. */
  nextWaypoint(passage: Passage): Square {
    const { from, to } = passage;
    const distances = this.routeTo(to.offset);
    const remaining = distances[from.offset] ?? UNCHARTED;
    if (remaining <= NEXT_DOOR) return to;
    const closer = HEADINGS.find((heading) => {
      const course = { row: from.row, col: from.col, heading, goal: to.offset };
      return this.canSail(course) && distances[offsetAhead(course)] === remaining - 1;
    });
    if (closer === undefined) return to;
    return Square.fromOffset(offsetAhead({ row: from.row, col: from.col, heading: closer }));
  }

  private routeTo(goal: number): number[] {
    const known = this.routes.get(goal);
    if (known !== undefined) return known;
    const distances = this.distancesTo(goal);
    this.routes.set(goal, distances);
    return distances;
  }

  private distancesTo(goal: number): number[] {
    const distances = new Array<number>(GRID_SQUARES).fill(UNCHARTED);
    distances[goal] = 0;
    const frontier = [goal];
    for (let index = 0; index < frontier.length; index += 1) {
      const offset = frontier[index];
      for (const from of this.approachesTo({ offset, goal })) {
        if (distances[from] !== UNCHARTED) continue;
        distances[from] = distances[offset] + 1;
        frontier.push(from);
      }
    }
    return distances;
  }

  /** The squares a boat could sail from to reach this one. */
  private approachesTo(arrival: { offset: number; goal: number }): number[] {
    const row = Math.floor(arrival.offset / COLUMNS);
    const col = arrival.offset % COLUMNS;
    const approaches: number[] = [];
    for (const heading of HEADINGS) {
      const from = {
        row: row - heading.rows,
        col: col - heading.cols,
        heading,
        goal: arrival.goal,
      };
      if (this.canSail(from)) approaches.push(from.row * COLUMNS + from.col);
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
    return clear && (offsetAhead(course) === course.goal || this.hasWayOn(course));
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

function offsetAhead(course: { row: number; col: number; heading: Heading }): number {
  return (course.row + course.heading.rows) * COLUMNS + course.col + course.heading.cols;
}
