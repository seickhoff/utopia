import {
  SIDES,
  type GameSnapshot,
  type PilotSnapshot,
  type Side,
  type SpriteSnapshot,
} from "@utopia/engine";
import {
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type BufferGeometry,
  type Material,
  type Scene,
} from "three";
import { CARD_SIZE, worldOfSprite, type WorldPoint } from "../board/rom-space.js";
import { BoatTrack } from "./boat-track.js";
import { trianglesGeometry } from "./geometry.js";
import { landAt, type GroundReading } from "./ground-fit.js";
import { fleetUnderWay, fleetWakes, type FleetKind } from "./fleets.js";
import { cursorFrame } from "./item-kits.js";
import type { KitStyle } from "./kit-style.js";
import { pilotRing } from "./pilot-ring.js";
import { rgb } from "./shapes.js";
import { SIDE_STYLES } from "./town-layout.js";

const PIRATE_SIZE = { width: 8, height: 4 };
const CURSOR_LIFT = 0.03;
/** The ring round a steered boat floats just over the water it sails on. */
const RING_LIFT = 0.02;
/** The ring lets more than half the sea show through: a hint at the boat, not a thing at sea. */
const RING_OPACITY = 0.4;
/**
 * The cursor, and the ring round a steered boat, are drawn over everything else, clouds and hills
 * included, so they are never cut off.
 */
const OVER_EVERYTHING = 10;
/** Where the cursor looks for the highest land under its square: corners and middle. */
const CURSOR_CORNERS = [
  { x: -0.5, z: -0.5 },
  { x: 0.5, z: -0.5 },
  { x: 0, z: 0 },
  { x: -0.5, z: 0.5 },
  { x: 0.5, z: 0.5 },
];
const SINK_PER_FRAME = 0.04;
/** Pirates fly no side's colour. */
const PIRATE_STYLE: KitStyle = { accent: rgb("#2e2a33") };
const MAX_PIRATES = 2;

/** A fleet's boats, the wake they leave while under way, and the track they have kept. */
interface FleetMeshes {
  readonly hull: Mesh;
  readonly wake: Mesh;
  readonly track: BoatTrack;
}

interface PilotMeshes {
  readonly cursor: Mesh;
  /** Marks the boat under the governor's hand, in place of the cursor while they sail. */
  readonly ring: Mesh;
  readonly boats: Readonly<Record<"fishingBoat" | "ptBoat", FleetMeshes>>;
}

/** How much of the way to its new heading a fleet swings each frame: a turn, not a snap. */
const HEADING_EASE = 0.12;

/** The sprites that move under their own steam: each governor's cursor or boat, and the pirates. */
export class MoverRenderer {
  private readonly pilots: Readonly<Record<Side, PilotMeshes>>;
  private readonly pirates: readonly FleetMeshes[];

  constructor(
    scene: Scene,
    private readonly ground: GroundReading,
  ) {
    const materials = {
      hull: new MeshLambertMaterial({ vertexColors: true }),
      wake: wakeMaterial(),
    };
    const addFleet = (fleet: { kind: FleetKind; style: KitStyle }) =>
      fleetMeshes({ scene, fleet, materials });
    const addOverlay = (material: Material) => (geometry: BufferGeometry) =>
      addHidden(scene, { mesh: new Mesh(geometry, material), order: OVER_EVERYTHING });
    const marks = {
      addCursor: addOverlay(overlayMaterial()),
      addRing: addOverlay(ringMaterial()),
    };
    this.pilots = {
      left: pilotMeshes({ side: "left", addFleet, ...marks }),
      right: pilotMeshes({ side: "right", addFleet, ...marks }),
    };
    this.pirates = Array.from({ length: MAX_PIRATES }, () =>
      addFleet({ kind: "pirate", style: PIRATE_STYLE }),
    );
  }

  update(snapshot: GameSnapshot): void {
    const over = snapshot.phase === "over";
    SIDES.forEach((side) =>
      this.showPilot({ meshes: this.pilots[side], pilot: snapshot.islands[side].pilot, over }),
    );
    const pirates = snapshot.sprites.filter((sprite) => sprite.kind === "pirate");
    this.pirates.forEach((mesh, index) => showPirate(mesh, pirates[index]));
  }

  private showPilot(shown: { meshes: PilotMeshes; pilot: PilotSnapshot; over: boolean }): void {
    const { meshes, pilot, over } = shown;
    const centre = worldOfSprite(pilot, CARD_SIZE);
    meshes.cursor.visible = !over && pilot.mode === "cursor";
    meshes.ring.visible = !over && pilot.mode === "sailing";
    meshes.boats.fishingBoat.hull.visible =
      !over && pilot.aboard === "fishingBoat" && pilot.mode !== "cursor";
    meshes.boats.ptBoat.hull.visible =
      !over && pilot.aboard === "ptBoat" && pilot.mode !== "cursor";
    loseSightOfHidden([meshes.boats.fishingBoat, meshes.boats.ptBoat]);
    if (meshes.cursor.visible) this.placeCursor(meshes.cursor, centre);
    if (pilot.aboard === "none") return;
    const boat = meshes.boats[pilot.aboard];
    steer(boat, { centre, sprite: pilot });
    meshes.ring.position.set(boat.track.x(), RING_LIFT, boat.track.z());
  }

  /** Lays the cursor level over the highest land in its square, so no slope hides a side of it. */
  private placeCursor(cursor: Mesh, centre: WorldPoint): void {
    const highest = Math.max(
      ...CURSOR_CORNERS.map((corner) =>
        landAt(this.ground, { x: centre.x + corner.x, z: centre.z + corner.z }),
      ),
    );
    cursor.position.set(centre.x, highest + CURSOR_LIFT, centre.z);
  }
}

interface PilotBuild {
  readonly side: Side;
  readonly addFleet: (fleet: { kind: FleetKind; style: KitStyle }) => FleetMeshes;
  /** Adds the cursor, drawn solid over everything else. */
  readonly addCursor: (geometry: BufferGeometry) => Mesh;
  /** Adds the ring round a steered boat, drawn over everything else with the sea showing through. */
  readonly addRing: (geometry: BufferGeometry) => Mesh;
}

function pilotMeshes(build: PilotBuild): PilotMeshes {
  const style = SIDE_STYLES[build.side];
  return {
    cursor: build.addCursor(trianglesGeometry(cursorFrame(style))),
    ring: build.addRing(trianglesGeometry(pilotRing(style))),
    boats: {
      fishingBoat: build.addFleet({ kind: "fishingBoat", style }),
      ptBoat: build.addFleet({ kind: "ptBoat", style }),
    },
  };
}

interface FleetBuild {
  readonly scene: Scene;
  readonly fleet: { kind: FleetKind; style: KitStyle };
  readonly materials: { hull: Material; wake: Material };
}

/** A fleet in formation, with its wake riding along as part of it. */
function fleetMeshes(build: FleetBuild): FleetMeshes {
  const { kind, style } = build.fleet;
  const hull = new Mesh(trianglesGeometry(fleetUnderWay(kind, style)), build.materials.hull);
  const wake = new Mesh(trianglesGeometry(fleetWakes(kind)), build.materials.wake);
  hull.add(wake);
  addHidden(build.scene, { mesh: hull, order: 0 });
  return { hull, wake, track: new BoatTrack() };
}

/** A fleet out of sight is drawn wherever it is next seen, not eased there from where it was. */
function loseSightOfHidden(fleets: readonly FleetMeshes[]): void {
  fleets.filter((fleet) => !fleet.hull.visible).forEach((fleet) => fleet.track.lose());
}

/** The foam behind a boat: white, faint, and never hiding the water under it. */
function wakeMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
}

/** Lit like the boats, but drawn last and through whatever stands in front of it. */
function overlayMaterial(): MeshLambertMaterial {
  return new MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

/** Drawn over everything as the cursor is, but unlit, so the band is one even, faint colour. */
function ringMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: RING_OPACITY,
    depthTest: false,
    depthWrite: false,
  });
}

function addHidden(scene: Scene, adding: { mesh: Mesh; order: number }): Mesh {
  const { mesh } = adding;
  mesh.visible = false;
  mesh.renderOrder = adding.order;
  scene.add(mesh);
  return mesh;
}

function showPirate(fleet: FleetMeshes, pirate: SpriteSnapshot | undefined): void {
  fleet.hull.visible = pirate !== undefined;
  loseSightOfHidden([fleet]);
  if (pirate === undefined) return;
  steer(fleet, { centre: worldOfSprite(pirate, PIRATE_SIZE), sprite: pirate });
}

interface Voyage {
  readonly centre: WorldPoint;
  readonly sprite: {
    readonly vx: number;
    readonly vy: number;
    readonly look: string;
    readonly frame: number;
  };
}

/**
 * Puts a fleet where its track has it and swings it round to the way it is going, its wake showing
 * while it is under way; a fleet going down sinks lower with every frame of the cartridge's
 * animation.
 */
function steer(fleet: FleetMeshes, voyage: Voyage): void {
  const { centre, sprite } = voyage;
  const { hull, track } = fleet;
  const sinking = sprite.look === "sinkingBoat" || sprite.look === "sinkingPirate";
  track.follow({ centre, velocity: sprite });
  const underWay = !sinking && track.isUnderWay();
  hull.position.set(track.x(), sinking ? -SINK_PER_FRAME * sprite.frame : 0, track.z());
  hull.rotation.z = sinking ? 0.08 * sprite.frame : 0;
  fleet.wake.visible = underWay;
  if (underWay) hull.rotation.y += shortestTurn(hull.rotation.y, track.bearing()) * HEADING_EASE;
}

/** The smaller way round from one heading to another, in radians. */
function shortestTurn(from: number, to: number): number {
  const gap = (to - from) % (2 * Math.PI);
  return gap > Math.PI ? gap - 2 * Math.PI : gap < -Math.PI ? gap + 2 * Math.PI : gap;
}
