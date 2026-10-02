import { isBoat, type Side, type SquareSnapshot } from "@utopia/engine";
import { worldOfCell } from "../board/rom-space.js";
import { fittedDistrict } from "./district-layout.js";
import { districtOf, isDeveloped } from "./districts/districts.js";
import type { GroundReading } from "./ground-fit.js";
import { fleetAtAnchor } from "./fleets.js";
import type { KitStyle } from "./kit-style.js";
import { merge, placed, rgb, type Triangles } from "./shapes.js";

export interface TownInput {
  readonly squares: readonly SquareSnapshot[];
  readonly ground: GroundReading;
}

/** Each side's colour on flags and hulls: the HUD's jade and coral. */
export const SIDE_STYLES: Readonly<Record<Side, KitStyle>> = {
  left: { accent: rgb("#43c275") },
  right: { accent: rgb("#ff5d3d") },
};

const NEUTRAL: KitStyle = { accent: rgb("#cccccc") };
const SINK_PER_FRAME = 0.035;

const EMPTY: Triangles = { positions: [], colors: [] };

/** Every district on its land, every anchored boat and wreck: land left bare shows as land. */
export function townTriangles(input: TownInput): Triangles {
  return merge(input.squares.map((square) => squareTriangles({ square, ground: input.ground })));
}

export interface SquareOnGround {
  readonly square: SquareSnapshot;
  readonly ground: GroundReading;
}

/** One square's models: its district, or its boat or wreck. */
export function squareTriangles(placement: SquareOnGround): Triangles {
  const { square } = placement;
  if (square.terrain === "land") return landModel(placement);
  if (square.occupant === "wreck") return wreckModel(square);
  return isBoat(square.occupant) ? boatModel(square) : EMPTY;
}

/** A district on its square, fitted to the land; bare land and fields (which the terrain paints) have none. */
function landModel(placement: SquareOnGround): Triangles {
  const { square, ground } = placement;
  if (!isDeveloped(square.occupant)) return EMPTY;
  const district = districtOf(square.occupant, styleOf(square));
  return fittedDistrict({ district, centre: worldOfCell(square), ground });
}

/** A fleet lying at anchor on its square, swung round a little differently on each square. */
function boatModel(square: SquareSnapshot): Triangles {
  if (!isBoat(square.occupant)) return EMPTY;
  const centre = worldOfCell(square);
  return placed(fleetAtAnchor(square.occupant, styleOf(square)), {
    offset: { x: centre.x, y: 0, z: centre.z },
    turn: ((square.row * 7 + square.col * 3) % 8) * (Math.PI / 4),
  });
}

/** An anchored fleet going down: lower with every frame of the cartridge's animation. */
function wreckModel(square: SquareSnapshot): Triangles {
  const centre = worldOfCell(square);
  const depth = -SINK_PER_FRAME * square.wreckFrame;
  return placed(fleetAtAnchor("fishingBoat", styleOf(square)), {
    offset: { x: centre.x, y: depth, z: centre.z },
    turn: 0.4,
  });
}

function styleOf(square: SquareSnapshot): KitStyle {
  return square.holder === "nobody" ? NEUTRAL : SIDE_STYLES[square.holder];
}
