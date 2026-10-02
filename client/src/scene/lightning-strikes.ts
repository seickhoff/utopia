import type { Cell, GameEvent } from "@utopia/engine";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  ShaderMaterial,
  type Scene,
} from "three";
import { worldOfCell, type WorldPoint } from "../board/rom-space.js";
import { BOLT_FRAGMENT, BOLT_VERTEX } from "./bolt-shaders.js";
import { boltShape, strikeAt, type BoltSegment, type StrikeMoment } from "./bolt-shape.js";
import { CLOUD_LOOKS } from "./cloud-looks.js";
import { surfaceAt, type GroundReading } from "./ground-fit.js";
import type { Vec3 } from "./shapes.js";

/** Strikes burning at once, and the stretches each may have: its channel, its branches, its flash. */
const MAX_STRIKES = 3;
const SEGMENTS_PER_STRIKE = 80;
/** How far toward its cloud's middle a bolt leaves the cloud from, from over what it strikes. */
const TOWARD_CLOUD = 0.4;
/** Where a bolt meets the ground it lights up a glow, a little taller than it is wide. */
const IMPACT = { width: 0.16, height: 0.05, brightness: 0.8 };
/** Drawn after the clouds and the rain, added to the light of whatever lies behind it. */
const DRAW_ORDER = 3;

interface Strike {
  readonly segments: readonly BoltSegment[];
  readonly began: number;
  /** Where it leaves its cloud. */
  readonly from: Vec3;
}

/**
 * Lightning striking whatever a thunderstorm destroys, the moment it is destroyed: a real bolt's
 * shape from the storm cloud's base down onto the square, its leader stepping down, its channel
 * flaring and flickering, a glow where it strikes, and the cloud lit from within as it does.
 */
export class LightningStrikes {
  private strikes: readonly Strike[] = [];
  private readonly ribbons: BoltRibbons;

  constructor(
    scene: Scene,
    private readonly ground: GroundReading,
  ) {
    this.ribbons = new BoltRibbons(scene);
  }

  /** Sends a bolt down onto every square a storm has smitten since the last frame. */
  hear(heard: {
    events: readonly GameEvent[];
    storms: readonly WorldPoint[];
    seconds: number;
  }): void {
    heard.events
      .flatMap(stormStruck)
      .forEach((cell) => this.strike({ cell, storms: heard.storms, seconds: heard.seconds }));
  }

  /** How brightly the strikes now burning light a cloud with its middle here. */
  glowNear(cloud: { centre: WorldPoint; radius: number; seconds: number }): number {
    const near = this.strikes.filter(
      ({ from }) => Math.hypot(from.x - cloud.centre.x, from.z - cloud.centre.z) <= cloud.radius,
    );
    return Math.max(0, ...near.map((strike) => strikeAt(cloud.seconds - strike.began).brightness));
  }

  draw(seconds: number): void {
    this.strikes = this.strikes.filter((strike) => !strikeAt(seconds - strike.began).over);
    this.ribbons.begin();
    this.strikes.forEach((strike) =>
      this.ribbons.add({ segments: strike.segments, moment: strikeAt(seconds - strike.began) }),
    );
    this.ribbons.finish();
  }

  private strike(striking: { cell: Cell; storms: readonly WorldPoint[]; seconds: number }): void {
    const target = worldOfCell(striking.cell);
    const cloud = nearest({ to: target, among: striking.storms });
    const from = {
      x: target.x + (cloud.x - target.x) * TOWARD_CLOUD,
      y: CLOUD_LOOKS.storm.height,
      z: target.z + (cloud.z - target.z) * TOWARD_CLOUD,
    };
    const to = { x: target.x, y: surfaceAt(this.ground, target), z: target.z };
    const seed = striking.cell.row * 0.131 + striking.cell.col * 0.071 + striking.seconds * 0.37;
    const segments = [...boltShape({ from, to, seed }), impactAt(to)];
    this.strikes = [...this.strikes, { segments, began: striking.seconds, from }].slice(
      -MAX_STRIKES,
    );
  }
}

/** The square a storm has just smitten a building on, or wrecked a boat on, if that is what happened. */
function stormStruck(event: GameEvent): Cell[] {
  const smiting = event.type === "itemSmitten" || event.type === "boatWrecked";
  return smiting && event.cause === "storm" ? [event.cell] : [];
}

/** The storm nearest a point; the point itself where no storm cloud is left to be seen. */
function nearest(looking: { to: WorldPoint; among: readonly WorldPoint[] }): WorldPoint {
  const away = (cloud: WorldPoint) => Math.hypot(cloud.x - looking.to.x, cloud.z - looking.to.z);
  return looking.among.reduce(
    (best, cloud) => (away(cloud) < away(best) ? cloud : best),
    looking.to,
  );
}

/** The glow where a bolt meets the ground, shown once its leader gets there. */
function impactAt(ground: Vec3): BoltSegment {
  return {
    from: ground,
    to: { ...ground, y: ground.y + IMPACT.height },
    width: IMPACT.width,
    brightness: IMPACT.brightness,
    reach: 1,
    main: false,
  };
}

/** Each stretch's four corners: from end and to end, each edge. */
const CORNERS = [0, -1, 0, 1, 1, -1, 1, 1];

/** Every strike's stretches as ribbons facing the camera, in one draw, into buffers made once. */
class BoltRibbons {
  private readonly geometry = new BufferGeometry();
  private readonly froms: BufferAttribute;
  private readonly tos: BufferAttribute;
  private readonly widths: BufferAttribute;
  private readonly glows: BufferAttribute;
  private segments = 0;

  constructor(scene: Scene) {
    const corners = MAX_STRIKES * SEGMENTS_PER_STRIKE * 4;
    const dynamic = (size: number) =>
      new BufferAttribute(new Float32Array(corners * size), size).setUsage(DynamicDrawUsage);
    [this.froms, this.tos, this.widths, this.glows] = [
      dynamic(3),
      dynamic(3),
      dynamic(1),
      dynamic(1),
    ];
    this.geometry.setAttribute("position", this.froms);
    this.geometry.setAttribute("aTo", this.tos);
    this.geometry.setAttribute("aWidth", this.widths);
    this.geometry.setAttribute("aGlow", this.glows);
    this.geometry.setAttribute("aCorner", new BufferAttribute(cornersFor(corners / 4), 2));
    this.geometry.setIndex(new BufferAttribute(indicesFor(corners / 4), 1));
    scene.add(boltMesh(this.geometry));
  }

  begin(): void {
    this.segments = 0;
  }

  /** A strike's stretches as far down as its leader has come, burning as brightly as it does now. */
  add(burning: { segments: readonly BoltSegment[]; moment: StrikeMoment }): void {
    const { moment } = burning;
    burning.segments
      .filter((segment) => segment.reach <= moment.reach)
      .forEach((segment) =>
        this.addSegment({ segment, glow: segment.brightness * moment.brightness }),
      );
  }

  finish(): void {
    this.geometry.setDrawRange(0, this.segments * 6);
    [this.froms, this.tos, this.widths, this.glows].forEach((attribute) => {
      attribute.needsUpdate = true;
    });
  }

  private addSegment(drawing: { segment: BoltSegment; glow: number }): void {
    if (this.segments >= this.froms.count / 4) return;
    const { from, to, width } = drawing.segment;
    for (let corner = this.segments * 4; corner < this.segments * 4 + 4; corner += 1) {
      this.froms.setXYZ(corner, from.x, from.y, from.z);
      this.tos.setXYZ(corner, to.x, to.y, to.z);
      this.widths.setX(corner, width);
      this.glows.setX(corner, drawing.glow);
    }
    this.segments += 1;
  }
}

function cornersFor(segments: number): Float32Array {
  const corners = new Float32Array(segments * CORNERS.length);
  for (let segment = 0; segment < segments; segment += 1)
    corners.set(CORNERS, segment * CORNERS.length);
  return corners;
}

/** Two triangles a stretch, across its four corners. */
function indicesFor(segments: number): Uint16Array {
  const indices = new Uint16Array(segments * 6);
  for (let segment = 0; segment < segments; segment += 1) {
    const first = segment * 4;
    indices.set([first, first + 2, first + 1, first + 1, first + 2, first + 3], segment * 6);
  }
  return indices;
}

function boltMesh(geometry: BufferGeometry): Mesh {
  const material = new ShaderMaterial({
    vertexShader: BOLT_VERTEX,
    fragmentShader: BOLT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = DRAW_ORDER;
  return mesh;
}
