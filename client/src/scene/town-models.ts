import type { SquareSnapshot } from "@utopia/engine";
import type { Triangles } from "./shapes.js";

/** Triangles ready for the GPU: three numbers a corner, and a normal facing out of each triangle. */
export interface TownBuffers {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly normals: Float32Array;
}

/**
 * The town's models, remembered square by square: a change on the board (a purchase, a storm, a
 * wreck going down a frame) re-models only the squares it touched, and the rest are reused.
 */
export class TownModels {
  private readonly models = new Map<string, TownBuffers>();

  constructor(private readonly model: (square: SquareSnapshot) => Triangles) {}

  /** Every square's model joined into one set of buffers. */
  build(squares: readonly SquareSnapshot[]): TownBuffers {
    const keys = squares.map((square) => JSON.stringify(square));
    const parts = squares.map((square, index) => this.remembered({ key: keys[index], square }));
    this.forgetAllBut(new Set(keys));
    return joined(parts);
  }

  private remembered(entry: { key: string; square: SquareSnapshot }): TownBuffers {
    const known = this.models.get(entry.key);
    if (known !== undefined) return known;
    const made = buffersOf(this.model(entry.square));
    this.models.set(entry.key, made);
    return made;
  }

  private forgetAllBut(keys: ReadonlySet<string>): void {
    for (const key of [...this.models.keys()]) {
      if (!keys.has(key)) this.models.delete(key);
    }
  }
}

function buffersOf(triangles: Triangles): TownBuffers {
  const positions = Float32Array.from(triangles.positions);
  return {
    positions,
    colors: Float32Array.from(triangles.colors),
    normals: flatNormals(positions),
  };
}

/** Each triangle's own normal, given to all three of its corners: flat shading. */
function flatNormals(positions: Float32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let corner = 0; corner < positions.length; corner += 9) {
    const [ax, ay, az] = [positions[corner], positions[corner + 1], positions[corner + 2]];
    const [ux, uy, uz] = [
      positions[corner + 3] - ax,
      positions[corner + 4] - ay,
      positions[corner + 5] - az,
    ];
    const [vx, vy, vz] = [
      positions[corner + 6] - ax,
      positions[corner + 7] - ay,
      positions[corner + 8] - az,
    ];
    const [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const length = Math.hypot(nx, ny, nz) || 1;
    for (let point = 0; point < 9; point += 3)
      normals.set([nx / length, ny / length, nz / length], corner + point);
  }
  return normals;
}

function joined(parts: readonly TownBuffers[]): TownBuffers {
  const total = parts.reduce((sum, part) => sum + part.positions.length, 0);
  const town = {
    positions: new Float32Array(total),
    colors: new Float32Array(total),
    normals: new Float32Array(total),
  };
  let offset = 0;
  for (const part of parts) {
    town.positions.set(part.positions, offset);
    town.colors.set(part.colors, offset);
    town.normals.set(part.normals, offset);
    offset += part.positions.length;
  }
  return town;
}
