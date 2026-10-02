import { box, merge, placed, type Triangles } from "../shapes.js";
import { extent, point, type VehicleSpec } from "./props.js";

/**
 * A fighter jet seen from above, its nose pointing the way it is turned: the fuselage, the wings
 * swept across it, and the tailplane.
 */
export function fighterJet(spec: VehicleSpec): Triangles {
  const colour = spec.colour;
  const jet = merge([
    box({ base: point([0, 0], 0), size: extent([0.052, 0.008, 0.009]), colour }),
    box({ base: point([-0.004, 0], 0.003), size: extent([0.018, 0.003, 0.05]), colour }),
    box({ base: point([-0.022, 0], 0.003), size: extent([0.008, 0.003, 0.022]), colour }),
  ]);
  return placed(jet, { offset: point(spec.spot, 0), turn: spec.turn });
}

/** A helicopter on the ground: its cabin, its tail boom, and its two rotor blades crossed above. */
export function helicopter(spec: VehicleSpec): Triangles {
  const colour = spec.colour;
  const blade = (turn: number) =>
    placed(box({ base: point([0, 0], 0.022), size: extent([0.08, 0.002, 0.004]), colour }), {
      offset: point([0, 0], 0),
      turn,
    });
  const craft = merge([
    box({ base: point([0, 0], 0), size: extent([0.04, 0.016, 0.017]), colour }),
    box({ base: point([-0.036, 0], 0.006), size: extent([0.034, 0.005, 0.005]), colour }),
    box({ base: point([0, 0], 0.016), size: extent([0.004, 0.006, 0.004]), colour }),
    blade(Math.PI / 4),
    blade(-Math.PI / 4),
  ]);
  return placed(craft, { offset: point(spec.spot, 0), turn: spec.turn });
}
