import type { KitStyle } from "../kit-style.js";
import { rgb, type Rgb, type Triangles } from "../shapes.js";
import type { District } from "./district.js";
import { CAR_COLOURS, block, car, house, lane, tree, type Spot } from "./props.js";

const WALLS: readonly Rgb[] = [rgb("#f2e8d5"), rgb("#e8d6b8"), rgb("#dfe6ea"), rgb("#f0d9c4")];
const ROOFS: readonly Rgb[] = [rgb("#a0452f"), rgb("#6b5a4a"), rgb("#4f5b66"), rgb("#8a3b2e")];
const FLAT_ROOF = rgb("#8b8f96");

/** Four rows of houses in the west half, two either side of the east-west street. */
const HOUSE_ROWS = [-0.37, -0.17, 0.17, 0.37];
const HOUSE_COLUMNS = [-0.4, -0.29, -0.18, -0.07];

const TREES: readonly Spot[] = [
  [0.17, -0.4],
  [0.44, -0.42],
  [0.17, 0.12],
  [0.44, 0.1],
  [0.18, 0.42],
  [0.44, 0.44],
];

const CARS: readonly { spot: Spot; turn: number }[] = [
  { spot: [-0.3, 0.012], turn: 0 },
  { spot: [0.2, -0.012], turn: Math.PI },
  { spot: [0.092, -0.3], turn: Math.PI / 2 },
  { spot: [0.068, 0.28], turn: -Math.PI / 2 },
];

/**
 * A neighbourhood: streets crossing the square, rows of houses with pitched roofs on the west side,
 * apartment blocks on the east with trees round them, and cars out on the streets.
 */
export function housingDistrict(style: KitStyle): District {
  return {
    decals: [
      lane({ from: [-0.47, 0], to: [0.47, 0] }),
      lane({ from: [0.08, -0.47], to: [0.08, 0.47] }),
    ],
    structures: [
      ...apartments(style),
      ...houses(),
      ...TREES.map((spot) => tree(spot, 0.045)),
      ...CARS.map(({ spot, turn }, index) => car({ spot, turn, colour: CAR_COLOURS[index] })),
    ],
  };
}

/** Two apartment blocks, the taller one roofed in the side's colour: the landmark. */
function apartments(style: KitStyle): Triangles[] {
  return [
    block({
      spot: [0.3, -0.24],
      size: [0.16, 0.2, 0.12],
      walls: WALLS[0],
      roof: style.accent,
      storeys: 4,
    }),
    block({
      spot: [0.3, 0.27],
      size: [0.18, 0.14, 0.12],
      walls: WALLS[1],
      roof: FLAT_ROOF,
      storeys: 3,
    }),
  ];
}

/** Rows of houses facing the street, no two neighbours quite alike. */
function houses(): Triangles[] {
  return HOUSE_ROWS.flatMap((z, row) =>
    HOUSE_COLUMNS.map((x, column) =>
      house({
        spot: [x, z],
        turn: row % 2 === 0 ? 0 : Math.PI,
        walls: WALLS[(row + column) % WALLS.length],
        roof: ROOFS[(row * 3 + column) % ROOFS.length],
      }),
    ),
  );
}
