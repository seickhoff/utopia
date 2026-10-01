import { SIDES, type PilotModeName, type Side } from "@utopia/engine";
import { Mesh, type Scene } from "three";
import type { WorldPoint } from "../board/rom-space.js";
import { OVER_EVERYTHING, layOverLand, overlayMaterial } from "./board-overlay.js";
import { trianglesGeometry } from "./geometry.js";
import type { GroundReading } from "./ground-fit.js";
import { pointerCross } from "./item-kits.js";
import { SIDE_STYLES } from "./town-layout.js";

/** Where the mouse is over the board, or "away": off the board, or no longer playing it. */
export type PointerSpot = WorldPoint | "away";

/** How the board shows the mouse: with a cross or not, and whether the system pointer is needed. */
interface PointerLook {
  readonly cross: boolean;
  /** "drawn" while the board shows where the mouse is; "system" while only the system pointer can. */
  readonly pointer: "drawn" | "system";
}

/**
 * How the board shows the mouse while the player's pilot is in each mode. The cursor snaps to the
 * square under the mouse and is pointer enough; a boat follows the mouse from afar, so a cross
 * marks where it is headed; a boat going down follows nothing.
 */
const LOOKS: Readonly<Record<PilotModeName, PointerLook>> = {
  cursor: { cross: false, pointer: "drawn" },
  sailing: { cross: true, pointer: "drawn" },
  sinking: { cross: false, pointer: "system" },
};

/** Special Case: the mouse away from the board, where only the system pointer can show it. */
const AWAY: PointerLook = { cross: false, pointer: "system" };

export interface PointerSetup {
  readonly ground: GroundReading;
  /** The canvas, told whether its system pointer is needed. */
  readonly canvas: Pick<HTMLElement, "dataset">;
}

/** What the board is shown this frame: whose mouse, their pilot's mode, and where the mouse is. */
export interface PointerShown {
  readonly side: Side;
  readonly mode: PilotModeName;
  readonly spot: PointerSpot;
}

/**
 * The mouse in the 3D view, shown on the board itself so it is found at a glance: the player's
 * cursor follows it, and while their boat does, a cross the size of the cursor in their colour
 * marks it. While the board shows the mouse, the system pointer is hidden.
 */
export class PointerRenderer {
  private readonly crosses: Readonly<Record<Side, Mesh>>;

  constructor(
    scene: Scene,
    private readonly setup: PointerSetup,
  ) {
    const material = overlayMaterial();
    const crossFor = (side: Side) => addCross(scene, new Mesh(crossGeometry(side), material));
    this.crosses = { left: crossFor("left"), right: crossFor("right") };
    this.putAway();
  }

  update(shown: PointerShown): void {
    if (shown.spot === "away") return this.putAway();
    const look = LOOKS[shown.mode];
    this.show(look);
    const cross = this.crosses[shown.side];
    cross.visible = look.cross;
    if (look.cross) layOverLand(cross, { ground: this.setup.ground, centre: shown.spot });
  }

  /** The mouse has left the board: the system pointer shows it again, with no frame to wait for. */
  putAway(): void {
    this.show(AWAY);
  }

  private show(look: PointerLook): void {
    SIDES.forEach((side) => (this.crosses[side].visible = false));
    const { dataset } = this.setup.canvas;
    if (dataset.pointer !== look.pointer) dataset.pointer = look.pointer;
  }
}

function crossGeometry(side: Side) {
  return trianglesGeometry(pointerCross(SIDE_STYLES[side]));
}

function addCross(scene: Scene, cross: Mesh): Mesh {
  cross.renderOrder = OVER_EVERYTHING;
  scene.add(cross);
  return cross;
}
