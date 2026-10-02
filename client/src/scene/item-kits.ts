import type { KitStyle } from "./kit-style.js";
import { straight, type Spot } from "./path-shapes.js";
import { merge, patch, quads, rgb, type Corner, type Triangles } from "./shapes.js";

const LANDFILL = rgb("#e2d2a6");
/** Landfill reaches this far past the footprint of what stands on it. */
const LANDFILL_MARGIN = 0.05;

/** Sand filled in under a building where its footprint runs into the sea, so it has dry land. */
export function landfill(footprint: { width: number; depth: number }): Triangles {
  return patch({
    width: footprint.width + 2 * LANDFILL_MARGIN,
    depth: footprint.depth + 2 * LANDFILL_MARGIN,
    cuts: 3,
    top: 0.008,
    skirt: 0.14,
    colour: LANDFILL,
  });
}

/** How wide the cursor's frame is, and how high it stands off the ground. */
export const CURSOR_BAND = 0.07;
const CURSOR_HEIGHT = 0.03;
/** Its foot lies a hair above the ground, so the land it is laid over never shows through it. */
const CURSOR_FOOT = 0.004;
/** How many pieces each side is cut into, so the frame can bend over the land beneath it. */
const CURSOR_CUTS = 8;

/**
 * The cursor: a hollow square in the governor's colour, as on the cartridge, in one piece, its
 * sides cut short enough to lie over rolling land. It is drawn over everything else, in the order
 * its triangles come, so its sides come first and its top last, over them.
 */
export function cursorFrame(style: KitStyle): Triangles {
  const outer = squareRing(0.5);
  const inner = squareRing(0.5 - CURSOR_BAND);
  const colour = style.accent;
  const next = (index: number) => (index + 1) % outer.length;
  const level = (ring: readonly Spot[], y: number) => (index: number) => {
    const [x, z] = ring[index];
    return [x, y, z] as const;
  };
  const [outerFoot, outerTop] = [level(outer, CURSOR_FOOT), level(outer, CURSOR_HEIGHT)];
  const [innerFoot, innerTop] = [level(inner, CURSOR_FOOT), level(inner, CURSOR_HEIGHT)];
  const band = (corners: (index: number) => Corner[]) =>
    merge(
      outer.map((_, index) => quads({ corners: corners(index), faces: [[0, 1, 2, 3]], colour })),
    );
  return merge([
    band((i) => [outerFoot(i), outerFoot(next(i)), outerTop(next(i)), outerTop(i)]),
    band((i) => [innerFoot(next(i)), innerFoot(i), innerTop(i), innerTop(next(i))]),
    band((i) => [outerTop(i), outerTop(next(i)), innerTop(next(i)), innerTop(i)]),
  ]);
}

/** Points round a square about its middle, anticlockwise seen from above from its south-west corner. */
function squareRing(half: number): Spot[] {
  const corners: Spot[] = [
    [-half, half],
    [half, half],
    [half, -half],
    [-half, -half],
  ];
  return corners.flatMap((corner, side) =>
    straight({ from: corner, to: corners[(side + 1) % 4], steps: CURSOR_CUTS }).slice(0, -1),
  );
}

/** How far the crosshairs reach across, how wide each bar is, and how high it stands. */
const CROSS_REACH = 0.25;
export const CROSS_BAR = 0.025;
const CROSS_HEIGHT = 0.0125;

/**
 * The mouse while a boat follows it: crosshairs in the governor's colour, a quarter of a square
 * across, in one solid piece. Drawn over everything else in the order its triangles come, its
 * sides come first and its top last, over them.
 */
export function pointerCross(style: KitStyle): Triangles {
  const colour = style.accent;
  const outline = plusOutline();
  const sides = outline.map((corner, index) => {
    const [[x0, z0], [x1, z1]] = [corner, outline[(index + 1) % outline.length]];
    const corners: Corner[] = [
      [x0, 0, z0],
      [x1, 0, z1],
      [x1, CROSS_HEIGHT, z1],
      [x0, CROSS_HEIGHT, z0],
    ];
    return quads({ corners, faces: [[0, 1, 2, 3]], colour });
  });
  return merge([...sides, ...plusTop().map((piece) => quads({ ...piece, colour }))]);
}

/** The crosshairs' outline seen from above, going anticlockwise from the foot of their south arm. */
function plusOutline(): Spot[] {
  const [bar, reach] = [CROSS_BAR / 2, CROSS_REACH / 2];
  return [
    [-bar, reach],
    [bar, reach],
    [bar, bar],
    [reach, bar],
    [reach, -bar],
    [bar, -bar],
    [bar, -reach],
    [-bar, -reach],
    [-bar, -bar],
    [-reach, -bar],
    [-reach, bar],
    [-bar, bar],
  ];
}

/** The crosshairs' top: their middle and their four arms, side by side and facing the sky. */
function plusTop(): { corners: Corner[]; faces: [readonly [number, number, number, number]] }[] {
  const [bar, reach] = [CROSS_BAR / 2, CROSS_REACH / 2];
  const piece = ([west, east, north, south]: readonly [number, number, number, number]) => ({
    corners: [
      [west, CROSS_HEIGHT, north],
      [west, CROSS_HEIGHT, south],
      [east, CROSS_HEIGHT, south],
      [east, CROSS_HEIGHT, north],
    ] as Corner[],
    faces: [[0, 1, 2, 3]] as [readonly [number, number, number, number]],
  });
  return [
    piece([-bar, bar, -bar, bar]),
    piece([bar, reach, -bar, bar]),
    piece([-reach, -bar, -bar, bar]),
    piece([-bar, bar, -reach, -bar]),
    piece([-bar, bar, bar, reach]),
  ];
}
