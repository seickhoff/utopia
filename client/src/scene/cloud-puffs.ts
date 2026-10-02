import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type Color,
  type Scene,
} from "three";
import { cloudHeap, type HeapSpec, type Puff } from "./cloud-heap.js";
import { hazeUniforms } from "./haze-glsl.js";
import { SUNLIGHT } from "./lighting.js";
import { PUFF_FRAGMENT, PUFF_VERTEX } from "./puff-shaders.js";
import type { Vec3 } from "./shapes.js";

/** A puff as it is shown this frame: where its cloud's base is, and how far it has swelled. */
interface PuffShowing {
  readonly puff: Puff;
  readonly base: Vec3;
  /** How much it has swelled or shrunk as the cloud billows. */
  readonly swell: number;
  readonly flash: number;
}

/** A heaped cloud this frame: its heap, where its base is, the time, and its colours and lightning. */
export interface HeapShowing {
  readonly cloud: HeapSpec;
  /** Where the camera is: the puffs are drawn far from it to near, each over those behind. */
  readonly eye: Vec3;
  readonly base: Vec3;
  readonly seconds: number;
  readonly tints: { readonly light: Color; readonly shade: Color };
  readonly flash: number;
}

/** How fast a heap's puffs billow, swelling and shrinking each at its own moment. */
const BILLOW = { perSecond: 0.45, swell: 0.05 };
/** How many clouds' heaps are kept, worked out once each, before they are all forgotten. */
const KEPT_HEAPS = 8;

/**
 * Every heaped cloud's puffs, drawn together in one call: a square turned to face the camera for
 * each puff, its place and colours written afresh each frame into buffers made once.
 */
export class CloudPuffs {
  private readonly geometry = new InstancedBufferGeometry();
  private readonly places: InstancedBufferAttribute;
  private readonly lights: InstancedBufferAttribute;
  private readonly shades: InstancedBufferAttribute;
  private readonly glows: InstancedBufferAttribute;
  private readonly mesh: Mesh;
  private readonly heaps = new Map<string, readonly Puff[]>();
  /** How far each puff of the cloud being shown lies from the camera, and the order they are drawn in. */
  private readonly distances: Float32Array;
  private readonly order: Int32Array;
  private count = 0;

  constructor(scene: Scene, setting: { capacity: number; order: number }) {
    const quad = new PlaneGeometry(2, 2);
    this.geometry.index = quad.index;
    this.geometry.setAttribute("position", quad.getAttribute("position"));
    const attributes = puffAttributes(setting.capacity);
    [this.places, this.lights, this.shades, this.glows] = [
      attributes.aPlace,
      attributes.aLight,
      attributes.aShade,
      attributes.aGlow,
    ];
    Object.entries(attributes).forEach(([name, attribute]) =>
      this.geometry.setAttribute(name, attribute),
    );
    this.distances = new Float32Array(setting.capacity);
    this.order = new Int32Array(setting.capacity);
    this.mesh = puffMesh({ geometry: this.geometry, order: setting.order });
    scene.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  /** A heaped cloud's puffs over its base, billowing, those farthest from the camera first. */
  heap(showing: HeapShowing): void {
    const puffs = this.heapOf(showing.cloud);
    const count = Math.min(puffs.length, this.order.length);
    this.sortFarToNear({ puffs, showing, count });
    for (let rank = 0; rank < count; rank += 1) {
      const index = this.order[rank];
      this.add({ ...showing, puff: puffs[index], swell: swellOf({ showing, index }) });
    }
  }

  /** Orders the puffs by how far each lies from the camera, farthest first, in place: nothing new made. */
  private sortFarToNear(sorting: {
    puffs: readonly Puff[];
    showing: HeapShowing;
    count: number;
  }): void {
    const { puffs, showing } = sorting;
    const { base, eye } = showing;
    for (let index = 0; index < sorting.count; index += 1) {
      const puff = puffs[index];
      const [dx, dy, dz] = [
        base.x + puff.x - eye.x,
        base.y + puff.y - eye.y,
        base.z + puff.z - eye.z,
      ];
      this.distances[index] = dx * dx + dy * dy + dz * dz;
      let rank = index;
      while (rank > 0 && this.distances[this.order[rank - 1]] < this.distances[index]) {
        this.order[rank] = this.order[rank - 1];
        rank -= 1;
      }
      this.order[rank] = index;
    }
  }

  private add(showing: PuffShowing & { tints: HeapShowing["tints"] }): void {
    if (this.count >= this.places.count) return;
    const { puff, base } = showing;
    const index = this.count;
    const radius = puff.radius * showing.swell;
    this.places.setXYZW(index, base.x + puff.x, base.y + puff.y, base.z + puff.z, radius);
    const { light, shade } = showing.tints;
    this.lights.setXYZ(index, light.r, light.g, light.b);
    this.shades.setXYZ(index, shade.r, shade.g, shade.b);
    this.glows.setXY(index, puff.rise, showing.flash);
    this.count += 1;
  }

  /** A cloud's heap, worked out the first time it is seen and kept while there are few to keep. */
  private heapOf(cloud: HeapSpec): readonly Puff[] {
    const key = `${cloud.radius}:${cloud.seed}`;
    const known = this.heaps.get(key);
    if (known !== undefined) return known;
    if (this.heaps.size >= KEPT_HEAPS) this.heaps.clear();
    const heap = cloudHeap(cloud);
    this.heaps.set(key, heap);
    return heap;
  }

  finish(): void {
    this.geometry.instanceCount = this.count;
    this.mesh.visible = this.count > 0;
    [this.places, this.lights, this.shades, this.glows].forEach((attribute) => {
      attribute.needsUpdate = true;
    });
  }
}

/** Each puff's place and size, its colours in sun and shade, and its height up the heap and lightning. */
function puffAttributes(capacity: number) {
  const instanced = (size: number) =>
    new InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(
      DynamicDrawUsage,
    );
  return { aPlace: instanced(4), aLight: instanced(3), aShade: instanced(3), aGlow: instanced(2) };
}

/** How far a puff has swelled or shrunk as its cloud billows, each puff at its own moment. */
function swellOf(billowing: { showing: HeapShowing; index: number }): number {
  return (
    1 +
    BILLOW.swell * Math.sin(billowing.showing.seconds * BILLOW.perSecond + billowing.index * 1.7)
  );
}

function puffMesh(making: { geometry: InstancedBufferGeometry; order: number }): Mesh {
  const material = new ShaderMaterial({
    vertexShader: PUFF_VERTEX,
    fragmentShader: PUFF_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSun: { value: new Vector3(SUNLIGHT.from.x, SUNLIGHT.from.y, SUNLIGHT.from.z).normalize() },
      ...hazeUniforms(),
    },
  });
  const mesh = new Mesh(making.geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = making.order;
  mesh.visible = false;
  return mesh;
}
