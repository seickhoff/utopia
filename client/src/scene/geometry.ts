import { BufferAttribute, BufferGeometry } from "three";
import type { Triangles } from "./shapes.js";
import type { MeshArrays } from "./terrain-mesh.js";
import type { TownBuffers } from "./town-models.js";

/** Flat-shaded triangles as a three.js geometry. */
export function trianglesGeometry(triangles: Triangles): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(Float32Array.from(triangles.positions), 3));
  geometry.setAttribute("color", new BufferAttribute(Float32Array.from(triangles.colors), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** An indexed, smooth-shaded terrain mesh as a three.js geometry, with each vertex's shore distance. */
export function indexedGeometry(mesh: MeshArrays): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("aShore", new BufferAttribute(mesh.shores, 2));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** The town's joined models as a three.js geometry, their flat normals already worked out. */
export function townGeometry(town: TownBuffers): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(town.positions, 3));
  geometry.setAttribute("color", new BufferAttribute(town.colors, 3));
  geometry.setAttribute("normal", new BufferAttribute(town.normals, 3));
  return geometry;
}
