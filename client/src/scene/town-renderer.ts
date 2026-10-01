import type { BoardSnapshot } from "@utopia/engine";
import { Mesh, MeshLambertMaterial, type Scene } from "three";
import { townGeometry } from "./geometry.js";
import type { GroundReading } from "./ground-fit.js";
import { squareTriangles } from "./town-layout.js";
import { TownModels } from "./town-models.js";

/**
 * The islands' districts and the boats at anchor: one mesh, one draw call, rebuilt only when the
 * board changes, and then re-modelling only the squares that changed.
 */
export class TownRenderer {
  private readonly mesh: Mesh;
  private readonly models: TownModels;
  private shownRevision = -1;

  constructor(scene: Scene, ground: GroundReading) {
    this.models = new TownModels((square) => squareTriangles({ square, ground }));
    this.mesh = new Mesh(undefined, new MeshLambertMaterial({ vertexColors: true }));
    scene.add(this.mesh);
  }

  update(board: BoardSnapshot): void {
    if (board.revision === this.shownRevision) return;
    this.shownRevision = board.revision;
    this.mesh.geometry.dispose();
    this.mesh.geometry = townGeometry(this.models.build(board.squares));
  }
}
