import { GRID_COLUMNS, STATUS_ROW, Square, type SquareSnapshot } from "@utopia/engine";

export interface RouteRequest {
  readonly squares: readonly SquareSnapshot[];
  readonly from: Square;
  readonly to: Square;
}

const ORTHOGONAL: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
const DIAGONAL: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const START = -1;

/**
 * The squares a boat passes through on the shortest way over open water from one square to
 * another, not counting the first. The sand bars stop a boat at any island square or wreck, and
 * judge each axis on its own, so a boat may go diagonally only where both squares beside the step
 * are open too. Where the destination cannot be reached, the route leads to the nearest square that
 * can.
 */
export function seaRoute(request: RouteRequest): Square[] {
  const blocked = blockedSquares(request.squares);
  const cameFrom = searchFrom({ from: request.from, blocked });
  return routeTo({ cameFrom, end: nearestReached({ cameFrom, to: request.to }) });
}

function blockedSquares(squares: readonly SquareSnapshot[]): ReadonlySet<number> {
  const blocked = squares.filter((cell) => cell.terrain === "land" || cell.occupant === "wreck");
  return new Set(blocked.map((cell) => Square.at(cell.row, cell.col).offset));
}

/** Every square a boat can reach, each with the square it is best reached from. */
function searchFrom(search: { from: Square; blocked: ReadonlySet<number> }): Map<number, number> {
  const cameFrom = new Map<number, number>([[search.from.offset, START]]);
  const queue = [search.from];
  for (let next = 0; next < queue.length; next += 1) {
    for (const step of stepsFrom({ square: queue[next], blocked: search.blocked })) {
      if (cameFrom.has(step.offset)) continue;
      cameFrom.set(step.offset, queue[next].offset);
      queue.push(step);
    }
  }
  return cameFrom;
}

function stepsFrom(at: { square: Square; blocked: ReadonlySet<number> }): Square[] {
  const open = (row: number, col: number) =>
    row >= 0 &&
    row < STATUS_ROW &&
    col >= 0 &&
    col < GRID_COLUMNS &&
    !at.blocked.has(row * GRID_COLUMNS + col);
  const { row, col } = at.square;
  const straight = ORTHOGONAL.filter(([dr, dc]) => open(row + dr, col + dc));
  const slanting = DIAGONAL.filter(
    ([dr, dc]) => open(row + dr, col + dc) && open(row + dr, col) && open(row, col + dc),
  );
  return [...straight, ...slanting].map(([dr, dc]) => Square.at(row + dr, col + dc));
}

/** The destination if it can be reached; otherwise the reachable square nearest it, reached soonest. */
function nearestReached(search: { cameFrom: Map<number, number>; to: Square }): Square {
  if (search.cameFrom.has(search.to.offset)) return search.to;
  const gap = (square: Square) =>
    Math.max(Math.abs(square.row - search.to.row), Math.abs(square.col - search.to.col));
  const reached = [...search.cameFrom.keys()].map((offset) => Square.fromOffset(offset));
  return reached.reduce((best, square) => (gap(square) < gap(best) ? square : best));
}

/** Walks back from the end to the start, leaving the start out. */
function routeTo(trail: { cameFrom: Map<number, number>; end: Square }): Square[] {
  const route: Square[] = [];
  let offset = trail.end.offset;
  while (offset !== START) {
    const previous = trail.cameFrom.get(offset) ?? START;
    if (previous !== START) route.unshift(Square.fromOffset(offset));
    offset = previous;
  }
  return route;
}
