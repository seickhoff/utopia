import type { KitStyle } from "./kit-style.js";
import { box, merge, patch, rgb, type Triangles } from "./shapes.js";

const LANDFILL = rgb("#e2d2a6");
/** Landfill reaches this far past the footprint of what stands on it. */
const LANDFILL_MARGIN = 0.05;

const at = ([x, y, z]: readonly [number, number, number]) => ({ x, y, z });

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

/** The cursor: a hollow square in the governor's colour, as on the cartridge. */
export function cursorFrame(style: KitStyle): Triangles {
  const thickness = 0.07;
  const reach = 0.5 - thickness / 2;
  const colour = style.accent;
  const inner = 1 - 2 * thickness;
  return merge([
    box({ base: at([0, 0, -reach]), size: at([1, 0.05, thickness]), colour }),
    box({ base: at([0, 0, reach]), size: at([1, 0.05, thickness]), colour }),
    box({ base: at([-reach, 0, 0]), size: at([thickness, 0.05, inner]), colour }),
    box({ base: at([reach, 0, 0]), size: at([thickness, 0.05, inner]), colour }),
  ]);
}

/** The mouse while a boat follows it: a cross the size of the cursor, in the governor's colour. */
export function pointerCross(style: KitStyle): Triangles {
  const thickness = 0.1;
  const colour = style.accent;
  return merge([
    box({ base: at([0, 0, 0]), size: at([1, 0.05, thickness]), colour }),
    box({ base: at([0, 0, 0]), size: at([thickness, 0.05, 1]), colour }),
  ]);
}
